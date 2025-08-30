-- Drop existing objects to ensure a clean slate
DROP FUNCTION IF EXISTS public.get_all_investment_withdrawal_requests(text, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_all_investment_withdrawal_requests_count(text, text);
DROP FUNCTION IF EXISTS public.process_investment_withdrawal_request(uuid, text, text);
DROP TABLE IF EXISTS public.investment_withdrawal_requests CASCADE;

-- Create the table
CREATE TABLE public.investment_withdrawal_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    investment_id uuid NOT NULL REFERENCES public.user_investments(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'Pending'::text,
    admin_notes text NULL,
    reviewed_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at timestamp with time zone NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.investment_withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own investment withdrawal requests" ON public.investment_withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create investment withdrawal requests" ON public.investment_withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all investment withdrawal requests" ON public.investment_withdrawal_requests FOR ALL USING (public.is_admin());

-- Create function to get requests (paginated and searchable)
CREATE OR REPLACE FUNCTION public.get_all_investment_withdrawal_requests(p_status_filter text DEFAULT NULL::text, p_search_text text DEFAULT NULL::text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
RETURNS TABLE(request_id uuid, user_id uuid, user_name text, user_email text, plan_name text, investment_amount numeric, investment_start_date date, requested_at timestamp with time zone, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        iwr.id, iwr.user_id, p.full_name, u.email, ip.name, ui.investment_amount, ui.start_date, iwr.created_at, iwr.status
    FROM public.investment_withdrawal_requests iwr
    JOIN public.user_investments ui ON iwr.investment_id = ui.id
    JOIN public.investment_plans ip ON ui.plan_id = ip.id
    JOIN public.profiles p ON iwr.user_id = p.id
    JOIN auth.users u ON iwr.user_id = u.id
    WHERE (p_status_filter IS NULL OR iwr.status = p_status_filter)
      AND (p_search_text IS NULL OR
           p.full_name ILIKE ('%' || p_search_text || '%') OR
           u.email ILIKE ('%' || p_search_text || '%'))
    ORDER BY CASE iwr.status WHEN 'Pending' THEN 1 ELSE 2 END, iwr.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Create function to count requests
CREATE OR REPLACE FUNCTION public.get_all_investment_withdrawal_requests_count(p_status_filter text DEFAULT NULL::text, p_search_text text DEFAULT NULL::text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
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
$$;

-- Create function to process requests
CREATE OR REPLACE FUNCTION public.process_investment_withdrawal_request(p_request_id uuid, p_new_status text, p_notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
    request record;
    investment record;
    admin_user_email TEXT;
BEGIN
    IF NOT (SELECT public.is_admin()) THEN RAISE EXCEPTION 'Permission denied.'; END IF;
    SELECT email INTO admin_user_email FROM auth.users WHERE id = auth.uid();

    UPDATE public.investment_withdrawal_requests
    SET status = p_new_status, admin_notes = p_notes, reviewed_at = NOW(), reviewed_by = auth.uid()
    WHERE id = p_request_id RETURNING * INTO request;

    IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;
    SELECT * INTO investment FROM public.user_investments WHERE id = request.investment_id;

    IF p_new_status = 'Approved' THEN
        UPDATE public.wallets SET balance = balance + investment.investment_amount WHERE user_id = request.user_id;
        INSERT INTO public.transactions (user_id, type, amount, description, status) VALUES (request.user_id, 'Investment Withdrawal', investment.investment_amount, 'Approved withdrawal for investment #' || SUBSTRING(investment.id::text, 1, 8), 'Completed');
        UPDATE public.user_investments SET status = 'Withdrawn' WHERE id = request.investment_id;
        INSERT INTO public.notifications (user_id, title, description, type, link_to) VALUES (request.user_id, 'Investment Withdrawn', 'Your request to withdraw your investment of ₹' || investment.investment_amount::text || ' has been approved. The funds have been added to your wallet.', 'success', '/wallet');
    ELSE -- Rejected
        INSERT INTO public.notifications (user_id, title, description, type, link_to) VALUES (request.user_id, 'Investment Withdrawal Rejected', 'Your withdrawal request was rejected. Reason: ' || p_notes, 'error', '/investments?tab=withdrawals');
    END IF;

    INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
    VALUES (auth.uid(), admin_user_email, 'processed_investment_withdrawal', request.user_id, jsonb_build_object('request_id', p_request_id, 'new_status', p_new_status, 'notes', p_notes));
END;
$$;