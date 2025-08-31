-- Step 1: Drop the existing table and all dependent objects.
-- The CASCADE option will automatically drop related functions and policies.
DROP TABLE IF EXISTS public.investment_withdrawal_requests CASCADE;

-- Step 2: Recreate the table with the correct schema.
CREATE TABLE public.investment_withdrawal_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    investment_id UUID NOT NULL REFERENCES public.user_investments(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'Pending'::text,
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 3: Enable Row Level Security (RLS).
ALTER TABLE public.investment_withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for users and admins.
CREATE POLICY "Users can view their own investment withdrawal requests"
ON public.investment_withdrawal_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create investment withdrawal requests"
ON public.investment_withdrawal_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all investment withdrawal requests"
ON public.investment_withdrawal_requests FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Step 5: Recreate the database functions.

-- Function for users to submit a request
CREATE OR REPLACE FUNCTION public.request_investment_withdrawal(p_investment_id uuid, p_amount numeric, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    investment_principal NUMERIC;
BEGIN
    IF EXISTS (SELECT 1 FROM public.investment_withdrawal_requests WHERE investment_id = p_investment_id AND status = 'Pending') THEN
        RAISE EXCEPTION 'An investment withdrawal request for this investment is already pending.';
    END IF;

    SELECT investment_amount INTO investment_principal FROM public.user_investments WHERE id = p_investment_id AND user_id = auth.uid() AND status = 'Active';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'This investment is not eligible for withdrawal.';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Withdrawal amount must be positive.';
    END IF;
    IF p_amount > investment_principal THEN
        RAISE EXCEPTION 'Withdrawal amount cannot exceed the investment principal of %.', investment_principal;
    END IF;

    INSERT INTO public.investment_withdrawal_requests (user_id, investment_id, amount, reason)
    VALUES (auth.uid(), p_investment_id, p_amount, p_reason);
END;
$function$;

-- Function for admins to process a request
CREATE OR REPLACE FUNCTION public.process_investment_withdrawal_request(p_request_id uuid, p_new_status text, p_notes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    request record;
    investment record;
    admin_user_email TEXT;
    remaining_amount NUMERIC;
BEGIN
    IF NOT (SELECT public.is_admin()) THEN RAISE EXCEPTION 'Permission denied.'; END IF;
    SELECT email INTO admin_user_email FROM auth.users WHERE id = auth.uid();

    UPDATE public.investment_withdrawal_requests SET status = p_new_status, admin_notes = p_notes, reviewed_at = NOW(), reviewed_by = auth.uid() WHERE id = p_request_id RETURNING * INTO request;
    IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;
    
    SELECT * INTO investment FROM public.user_investments WHERE id = request.investment_id;

    IF p_new_status = 'Approved' THEN
        IF request.amount > investment.investment_amount THEN
            RAISE EXCEPTION 'Withdrawal amount exceeds current investment principal.';
        END IF;

        UPDATE public.wallets SET balance = balance + request.amount WHERE user_id = request.user_id;
        INSERT INTO public.transactions (user_id, type, amount, description, status) VALUES (request.user_id, 'Investment Withdrawal', request.amount, 'Approved withdrawal for investment #' || SUBSTRING(investment.id::text, 1, 8), 'Completed');
        
        remaining_amount := investment.investment_amount - request.amount;
        
        IF remaining_amount > 0.009 THEN
            UPDATE public.user_investments SET investment_amount = remaining_amount WHERE id = request.investment_id;
            INSERT INTO public.notifications (user_id, title, description, type, link_to) VALUES (request.user_id, 'Partial Investment Withdrawal Approved', 'Your request to withdraw ₹' || request.amount::text || ' has been approved. The funds have been added to your wallet. The remaining principal is ₹' || remaining_amount::text || '.', 'success', '/wallet');
        ELSE
            UPDATE public.user_investments SET status = 'Withdrawn', investment_amount = 0 WHERE id = request.investment_id;
            INSERT INTO public.notifications (user_id, title, description, type, link_to) VALUES (request.user_id, 'Full Investment Withdrawal Approved', 'Your request to withdraw your full investment of ₹' || request.amount::text || ' has been approved. The funds have been added to your wallet.', 'success', '/wallet');
        END IF;
    ELSE -- Rejected
        INSERT INTO public.notifications (user_id, title, description, type, link_to) VALUES (request.user_id, 'Investment Withdrawal Rejected', 'Your withdrawal request for ₹' || request.amount::text || ' was rejected. Reason: ' || p_notes, 'error', '/investments?tab=withdrawals');
    END IF;

    INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
    VALUES (auth.uid(), admin_user_email, 'processed_investment_withdrawal', request.user_id, jsonb_build_object('request_id', p_request_id, 'new_status', p_new_status, 'amount', request.amount, 'notes', p_notes));
END;
$function$;

-- Function for users to get their request history
CREATE OR REPLACE FUNCTION public.get_my_investment_withdrawal_requests()
 RETURNS TABLE(request_id uuid, plan_name text, investment_amount numeric, requested_amount numeric, requested_at timestamp with time zone, status text, admin_notes text, reason text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT iwr.id, ip.name, ui.investment_amount, iwr.amount, iwr.created_at, iwr.status, iwr.admin_notes, iwr.reason
    FROM public.investment_withdrawal_requests iwr
    JOIN public.user_investments ui ON iwr.investment_id = ui.id
    JOIN public.investment_plans ip ON ui.plan_id = ip.id
    WHERE iwr.user_id = auth.uid()
    ORDER BY iwr.created_at DESC;
END;
$function$;

-- Function for admins to get all requests (paginated and searchable)
CREATE OR REPLACE FUNCTION public.get_all_investment_withdrawal_requests(p_status_filter text DEFAULT NULL::text, p_search_text text DEFAULT NULL::text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(request_id uuid, user_id uuid, user_name text, user_email text, plan_name text, investment_amount numeric, requested_amount numeric, investment_start_date date, requested_at timestamp with time zone, status text, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT iwr.id, iwr.user_id, p.full_name, u.email, ip.name, ui.investment_amount, iwr.amount, ui.start_date, iwr.created_at, iwr.status, iwr.reason
    FROM public.investment_withdrawal_requests iwr
    JOIN public.user_investments ui ON iwr.investment_id = ui.id
    JOIN public.investment_plans ip ON ui.plan_id = ip.id
    JOIN public.profiles p ON iwr.user_id = p.id
    JOIN auth.users u ON iwr.user_id = u.id
    WHERE (p_status_filter IS NULL OR iwr.status = p_status_filter)
      AND (p_search_text IS NULL OR (p.full_name ILIKE ('%' || p_search_text || '%') OR u.email ILIKE ('%' || p_search_text || '%')))
    ORDER BY CASE iwr.status WHEN 'Pending' THEN 1 ELSE 2 END, iwr.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- Function for admin pagination count
CREATE OR REPLACE FUNCTION public.get_all_investment_withdrawal_requests_count(p_status_filter text DEFAULT NULL::text, p_search_text text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.investment_withdrawal_requests iwr
        JOIN public.profiles p ON iwr.user_id = p.id
        JOIN auth.users u ON iwr.user_id = u.id
        WHERE (p_status_filter IS NULL OR iwr.status = p_status_filter)
          AND (p_search_text IS NULL OR
               p.full_name ILIKE ('%' || p_search_text || '%') OR
               u.email ILIKE ('%' || p_search_text || '%'))
    );
END;
$function$;