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
$function$