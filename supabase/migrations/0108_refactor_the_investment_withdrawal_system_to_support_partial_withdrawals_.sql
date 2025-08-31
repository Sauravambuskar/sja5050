-- Add a nullable 'amount' column for the requested withdrawal amount
ALTER TABLE public.investment_withdrawal_requests
ADD COLUMN IF NOT EXISTS amount NUMERIC;

-- For any existing requests from the previous implementation, this will set their requested amount
-- to the full principal of the investment, as that was the only option.
UPDATE public.investment_withdrawal_requests iwr
SET amount = ui.investment_amount
FROM public.user_investments ui
WHERE iwr.investment_id = ui.id AND iwr.amount IS NULL;

-- Now that all rows have a value, make the column required.
ALTER TABLE public.investment_withdrawal_requests
ALTER COLUMN amount SET NOT NULL;

-- Drop existing functions before recreating them with new parameters and return types
DROP FUNCTION IF EXISTS public.request_investment_withdrawal(uuid, text);
DROP FUNCTION IF EXISTS public.process_investment_withdrawal_request(uuid, text, text);
DROP FUNCTION IF EXISTS public.get_my_investment_withdrawal_requests();
DROP FUNCTION IF EXISTS public.get_all_investment_withdrawal_requests(text, text, integer, integer);

-- Recreate function to request a withdrawal with a specific amount
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

-- Recreate function to process withdrawals, handling partial vs full amounts
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

-- Recreate function for users to get their requests
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

-- Recreate function for admins to get all requests
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