-- Function for a user to request a withdrawal
CREATE OR REPLACE FUNCTION public.request_investment_withdrawal(p_investment_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if there's already a pending request for this investment
    IF EXISTS (
        SELECT 1 FROM public.investment_withdrawal_requests
        WHERE investment_id = p_investment_id AND status = 'Pending'
    ) THEN
        RAISE EXCEPTION 'An investment withdrawal request for this investment is already pending.';
    END IF;

    -- Check if the user owns this investment and it is active
    IF NOT EXISTS (
        SELECT 1 FROM public.user_investments
        WHERE id = p_investment_id AND user_id = auth.uid() AND status = 'Active'
    ) THEN
        RAISE EXCEPTION 'This investment is not eligible for withdrawal.';
    END IF;

    INSERT INTO public.investment_withdrawal_requests (user_id, investment_id)
    VALUES (auth.uid(), p_investment_id);
END;
$$;

-- Function for a user to get their request history
CREATE OR REPLACE FUNCTION public.get_my_investment_withdrawal_requests()
RETURNS TABLE(
    request_id UUID,
    plan_name TEXT,
    investment_amount NUMERIC,
    requested_at TIMESTAMPTZ,
    status TEXT,
    admin_notes TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        iwr.id,
        ip.name,
        ui.investment_amount,
        iwr.created_at,
        iwr.status,
        iwr.admin_notes
    FROM public.investment_withdrawal_requests iwr
    JOIN public.user_investments ui ON iwr.investment_id = ui.id
    JOIN public.investment_plans ip ON ui.plan_id = ip.id
    WHERE iwr.user_id = auth.uid()
    ORDER BY iwr.created_at DESC;
END;
$$;

-- Function for admin to get all requests
CREATE OR REPLACE FUNCTION public.get_all_investment_withdrawal_requests()
RETURNS TABLE(
    request_id UUID,
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    plan_name TEXT,
    investment_amount NUMERIC,
    investment_start_date DATE,
    requested_at TIMESTAMPTZ,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        iwr.id,
        iwr.user_id,
        p.full_name,
        u.email,
        ip.name,
        ui.investment_amount,
        ui.start_date,
        iwr.created_at,
        iwr.status
    FROM public.investment_withdrawal_requests iwr
    JOIN public.user_investments ui ON iwr.investment_id = ui.id
    JOIN public.investment_plans ip ON ui.plan_id = ip.id
    JOIN public.profiles p ON iwr.user_id = p.id
    JOIN auth.users u ON iwr.user_id = u.id
    ORDER BY CASE iwr.status WHEN 'Pending' THEN 1 ELSE 2 END, iwr.created_at DESC;
END;
$$;

-- Function for admin to process requests
CREATE OR REPLACE FUNCTION public.process_investment_withdrawal_request(
    p_request_id UUID,
    p_new_status TEXT,
    p_notes TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    request record;
    investment record;
    admin_user_email TEXT;
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Permission denied. Must be an admin.';
    END IF;

    SELECT email INTO admin_user_email FROM auth.users WHERE id = auth.uid();

    UPDATE public.investment_withdrawal_requests
    SET
        status = p_new_status,
        admin_notes = p_notes,
        reviewed_at = NOW(),
        reviewed_by = auth.uid()
    WHERE id = p_request_id
    RETURNING * INTO request;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Investment withdrawal request not found.';
    END IF;

    SELECT * INTO investment FROM public.user_investments WHERE id = request.investment_id;

    IF p_new_status = 'Approved' THEN
        -- Move funds to wallet
        UPDATE public.wallets
        SET balance = balance + investment.investment_amount
        WHERE user_id = request.user_id;

        -- Log transaction
        INSERT INTO public.transactions (user_id, type, amount, description, status)
        VALUES (request.user_id, 'Investment Withdrawal', investment.investment_amount, 'Approved withdrawal for investment #' || SUBSTRING(investment.id::text, 1, 8), 'Completed');

        -- Update investment status
        UPDATE public.user_investments
        SET status = 'Withdrawn'
        WHERE id = request.investment_id;

        -- Send notification
        INSERT INTO public.notifications (user_id, title, description, type, link_to)
        VALUES (request.user_id, 'Investment Withdrawn', 'Your request to withdraw your investment of ₹' || investment.investment_amount::text || ' has been approved. The funds have been added to your wallet.', 'success', '/wallet');

    ELSE -- Rejected
        INSERT INTO public.notifications (user_id, title, description, type, link_to)
        VALUES (request.user_id, 'Investment Withdrawal Rejected', 'Your withdrawal request was rejected. Reason: ' || p_notes, 'error', '/investments?tab=withdrawals');
    END IF;

    -- Log admin action
    INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
    VALUES (auth.uid(), admin_user_email, 'processed_investment_withdrawal', request.user_id, jsonb_build_object('request_id', p_request_id, 'new_status', p_new_status, 'notes', p_notes));
END;
$$;