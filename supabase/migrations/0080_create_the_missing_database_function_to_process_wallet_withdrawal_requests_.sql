CREATE OR REPLACE FUNCTION public.process_withdrawal_request(request_id_to_process uuid, new_status text, notes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    target_user_id UUID;
    withdrawal_amount NUMERIC;
    admin_user_email TEXT;
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Permission denied. Must be an admin.';
    END IF;

    -- Get admin email for logging
    SELECT email INTO admin_user_email FROM auth.users WHERE id = auth.uid();

    -- Update the request and get user_id and amount
    UPDATE public.withdrawal_requests
    SET
        status = new_status,
        admin_notes = notes,
        reviewed_at = NOW(),
        reviewed_by = auth.uid()
    WHERE id = request_id_to_process
    RETURNING user_id, amount INTO target_user_id, withdrawal_amount;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Withdrawal request not found.';
    END IF;

    -- If completed, debit wallet, create transaction, and notify user
    IF new_status = 'Completed' THEN
        -- Debit user's wallet
        UPDATE public.wallets
        SET balance = balance - withdrawal_amount
        WHERE user_id = target_user_id;

        -- Log the transaction
        INSERT INTO public.transactions (user_id, type, amount, description, status)
        VALUES (target_user_id, 'Withdrawal', withdrawal_amount, 'Withdrawal request processed by admin.', 'Completed');

        -- Send notification
        INSERT INTO public.notifications (user_id, title, description, type, link_to)
        VALUES (target_user_id, 'Withdrawal Processed', 'Your withdrawal of ₹' || withdrawal_amount::text || ' has been processed.', 'success', '/wallet');
    ELSE -- If Rejected
        INSERT INTO public.notifications (user_id, title, description, type, link_to)
        VALUES (target_user_id, 'Withdrawal Rejected', 'Your withdrawal request was rejected. Reason: ' || notes, 'error', '/wallet');
    END IF;

    -- Log the admin action
    INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
    VALUES (auth.uid(), admin_user_email, 'processed_withdrawal_request', target_user_id, jsonb_build_object('request_id', request_id_to_process, 'new_status', new_status, 'notes', notes));
END;
$function$