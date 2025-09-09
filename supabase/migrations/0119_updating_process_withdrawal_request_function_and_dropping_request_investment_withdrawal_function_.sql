-- Drop the request_investment_withdrawal function as it's no longer needed
DROP FUNCTION IF EXISTS public.request_investment_withdrawal(p_investment_id uuid, p_amount numeric, p_reason text);

-- Update the process_withdrawal_request function to remove investment withdrawal logic
CREATE OR REPLACE FUNCTION public.process_withdrawal_request(p_request_id uuid, p_new_status text, p_notes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    request record;
    admin_user_email TEXT;
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Permission denied.'; END IF;

    SELECT email INTO admin_user_email FROM auth.users WHERE id = auth.uid();

    UPDATE public.withdrawal_requests
    SET status = p_new_status, admin_notes = p_notes, reviewed_at = NOW(), reviewed_by = auth.uid()
    WHERE id = p_request_id RETURNING * INTO request;

    IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;

    IF p_new_status = 'Approved' THEN
        IF request.type = 'Wallet' THEN
            -- This is a withdrawal from the user's wallet to their bank
            UPDATE public.wallets SET balance = balance - request.amount WHERE user_id = request.user_id;
            UPDATE public.withdrawal_requests SET status = 'Completed' WHERE id = p_request_id;
            INSERT INTO public.transactions (user_id, type, amount, description, status) VALUES (request.user_id, 'Withdrawal', request.amount, 'Wallet withdrawal processed', 'Completed');
            INSERT INTO public.notifications (user_id, title, description, type, link_to) VALUES (request.user_id, 'Withdrawal Processed', 'Your withdrawal of ₹' || request.amount::text || ' has been processed.', 'success', '/wallet');
        END IF;
    ELSE -- Status is 'Rejected'
        INSERT INTO public.notifications (user_id, title, description, type, link_to)
        VALUES (request.user_id, 'Withdrawal Rejected', 'Your withdrawal request for ₹' || request.amount::text || ' was rejected. Reason: ' || p_notes, 'error', '/wallet');
    END IF;

    INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
    VALUES (auth.uid(), admin_user_email, 'processed_withdrawal_request', request.user_id, jsonb_build_object('request_id', p_request_id, 'new_status', p_new_status, 'amount', request.amount, 'notes', p_notes));
END;
$function$;