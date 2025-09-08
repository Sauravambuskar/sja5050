-- 1. Create the table for investment cancellation requests
CREATE TABLE public.investment_cancellation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    investment_id UUID NOT NULL REFERENCES public.user_investments(id) ON DELETE CASCADE,
    cancellation_amount NUMERIC NOT NULL CHECK (cancellation_amount > 0),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    admin_notes TEXT
);

-- 2. Enable RLS and create policies
ALTER TABLE public.investment_cancellation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own cancellation requests" ON public.investment_cancellation_requests FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all cancellation requests" ON public.investment_cancellation_requests FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. Function for users to submit a cancellation request
CREATE OR REPLACE FUNCTION public.request_investment_cancellation(p_investment_id uuid, p_cancellation_amount numeric, p_reason text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    investment_principal NUMERIC;
BEGIN
    SELECT investment_amount INTO investment_principal
    FROM public.user_investments
    WHERE id = p_investment_id AND user_id = auth.uid() AND status = 'Active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'This investment is not active or does not belong to you.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.investment_cancellation_requests WHERE investment_id = p_investment_id AND status = 'Pending') THEN
        RAISE EXCEPTION 'A cancellation request for this investment is already pending.';
    END IF;

    IF p_cancellation_amount > investment_principal THEN
        RAISE EXCEPTION 'Cancellation amount cannot exceed the investment principal.';
    END IF;

    INSERT INTO public.investment_cancellation_requests (user_id, investment_id, cancellation_amount, reason)
    VALUES (auth.uid(), p_investment_id, p_cancellation_amount, p_reason);
END;
$$;

-- 4. Function for admins to process a cancellation request
CREATE OR REPLACE FUNCTION public.process_investment_cancellation_request(p_request_id uuid, p_new_status text, p_admin_notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
    request record;
    investment record;
    remaining_amount NUMERIC;
    admin_user_email TEXT;
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Permission denied.'; END IF;

    SELECT email INTO admin_user_email FROM auth.users WHERE id = auth.uid();

    UPDATE public.investment_cancellation_requests
    SET status = p_new_status, admin_notes = p_admin_notes, reviewed_at = NOW(), reviewed_by = auth.uid()
    WHERE id = p_request_id
    RETURNING * INTO request;

    IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;

    IF p_new_status = 'Approved' THEN
        SELECT * INTO investment FROM public.user_investments WHERE id = request.investment_id;
        UPDATE public.wallets SET balance = balance + request.cancellation_amount WHERE user_id = request.user_id;
        INSERT INTO public.transactions (user_id, type, amount, description, status)
        VALUES (request.user_id, 'Investment Cancellation', request.cancellation_amount, 'Approved cancellation for investment in ' || (SELECT name FROM investment_plans WHERE id = investment.plan_id), 'Completed');

        remaining_amount := investment.investment_amount - request.cancellation_amount;
        IF remaining_amount > 0.009 THEN
            UPDATE public.user_investments SET investment_amount = remaining_amount WHERE id = investment.id;
            INSERT INTO public.notifications (user_id, title, description, type, link_to)
            VALUES (request.user_id, 'Partial Investment Cancellation Approved', 'Your request to cancel and withdraw ₹' || request.cancellation_amount::text || ' has been approved. The funds have been added to your wallet.', 'success', '/wallet');
        ELSE
            UPDATE public.user_investments SET status = 'Withdrawn', investment_amount = 0 WHERE id = investment.id;
            INSERT INTO public.notifications (user_id, title, description, type, link_to)
            VALUES (request.user_id, 'Full Investment Cancellation Approved', 'Your request to cancel your full investment of ₹' || request.cancellation_amount::text || ' has been approved.', 'success', '/wallet');
        END IF;
    ELSE
        INSERT INTO public.notifications (user_id, title, description, type, link_to)
        VALUES (request.user_id, 'Investment Cancellation Rejected', 'Your cancellation request for ₹' || request.cancellation_amount::text || ' was rejected. Reason: ' || p_admin_notes, 'error', '/support');
    END IF;

    INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
    VALUES (auth.uid(), admin_user_email, 'processed_investment_cancellation', request.user_id, jsonb_build_object('request_id', p_request_id, 'new_status', p_new_status, 'amount', request.cancellation_amount, 'notes', p_admin_notes));
END;
$$;

-- 5. Function for admins to get all cancellation requests
CREATE OR REPLACE FUNCTION public.get_all_investment_cancellation_requests(p_status_filter text, p_search_text text, p_limit integer, p_offset integer)
RETURNS TABLE(request_id uuid, user_id uuid, user_name text, user_email text, plan_name text, investment_amount numeric, cancellation_amount numeric, reason text, requested_at timestamptz, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
    RETURN QUERY
    SELECT icr.id, icr.user_id, p.full_name, u.email, ip.name, ui.investment_amount, icr.cancellation_amount, icr.reason, icr.requested_at, icr.status
    FROM public.investment_cancellation_requests icr
    JOIN public.user_investments ui ON icr.investment_id = ui.id
    JOIN public.investment_plans ip ON ui.plan_id = ip.id
    JOIN public.profiles p ON icr.user_id = p.id
    JOIN auth.users u ON icr.user_id = u.id
    WHERE (p_status_filter IS NULL OR icr.status = p_status_filter) AND
          (p_search_text IS NULL OR p.full_name ILIKE ('%' || p_search_text || '%') OR u.email ILIKE ('%' || p_search_text || '%'))
    ORDER BY CASE icr.status WHEN 'Pending' THEN 1 ELSE 2 END, icr.requested_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 6. Function to count all cancellation requests
CREATE OR REPLACE FUNCTION public.get_all_investment_cancellation_requests_count(p_status_filter text, p_search_text text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM public.investment_cancellation_requests icr
            JOIN public.profiles p ON icr.user_id = p.id
            JOIN auth.users u ON icr.user_id = u.id
            WHERE (p_status_filter IS NULL OR icr.status = p_status_filter) AND
                  (p_search_text IS NULL OR p.full_name ILIKE ('%' || p_search_text || '%') OR u.email ILIKE ('%' || p_search_text || '%')));
END;
$$;

-- 7. Function for users to get their cancellation history
CREATE OR REPLACE FUNCTION public.get_my_investment_cancellation_requests()
RETURNS TABLE(request_id uuid, plan_name text, cancellation_amount numeric, requested_at timestamptz, status text, admin_notes text)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT icr.id, ip.name, icr.cancellation_amount, icr.requested_at, icr.status, icr.admin_notes
    FROM public.investment_cancellation_requests icr
    JOIN public.user_investments ui ON icr.investment_id = ui.id
    JOIN public.investment_plans ip ON ui.plan_id = ip.id
    WHERE icr.user_id = auth.uid()
    ORDER BY icr.requested_at DESC;
END;
$$;

-- 8. Update admin dashboard stats function
DROP FUNCTION IF EXISTS public.get_admin_dashboard_stats();
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE(total_users bigint, aum numeric, pending_kyc bigint, pending_withdrawals_count bigint, pending_deposits_count bigint, pending_deposits_value numeric, pending_investments_count bigint, pending_investments_value numeric, monthly_payout_projection numeric, pending_cancellations_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
    RETURN QUERY SELECT
        (SELECT COUNT(*) FROM auth.users),
        (SELECT COALESCE(SUM(investment_amount), 0) FROM public.user_investments WHERE status = 'Active'),
        (SELECT COUNT(*) FROM public.kyc_documents WHERE status = 'Pending'),
        (SELECT COUNT(*) FROM public.withdrawal_requests WHERE status = 'Pending'),
        (SELECT COUNT(*) FROM public.deposit_requests WHERE status = 'Pending'),
        (SELECT COALESCE(SUM(amount), 0) FROM public.deposit_requests WHERE status = 'Pending'),
        (SELECT COUNT(*) FROM public.investment_requests WHERE status = 'Pending'),
        (SELECT COALESCE(SUM(amount), 0) FROM public.investment_requests WHERE status = 'Pending'),
        (SELECT COALESCE(SUM(ui.investment_amount * (ip.annual_rate / 100.0 / 12.0)), 0) FROM public.user_investments ui JOIN public.investment_plans ip ON ui.plan_id = ip.id WHERE ui.status = 'Active'),
        (SELECT COUNT(*) FROM public.investment_cancellation_requests WHERE status = 'Pending');
END;
$$;