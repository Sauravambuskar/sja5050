-- Drop functions that depend on the tables first
DROP FUNCTION IF EXISTS public.get_my_wallet_balance();
DROP FUNCTION IF EXISTS public.submit_deposit_request(p_amount numeric, p_reference_id text, p_screenshot_path text);
DROP FUNCTION IF EXISTS public.get_all_deposit_requests(p_status_filter text, p_search_text text, p_limit integer, p_offset integer);
DROP FUNCTION IF EXISTS public.get_all_deposit_requests_count(p_status_filter text, p_search_text text);
DROP FUNCTION IF EXISTS public.process_deposit_request(request_id_to_process uuid, new_status text, notes text);
DROP FUNCTION IF EXISTS public.request_wallet_withdrawal(p_amount numeric);
DROP FUNCTION IF EXISTS public.admin_adjust_wallet_balance(p_user_id uuid, p_amount numeric, p_description text);

-- Drop the tables
DROP TABLE IF EXISTS public.wallets;
DROP TABLE IF EXISTS public.deposit_requests;

-- Also update the process_withdrawal_request to remove any wallet logic, even though it's now unreachable
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

    -- Since wallet is removed, only rejection logic is relevant now for any leftover requests.
    IF p_new_status = 'Rejected' THEN
        INSERT INTO public.notifications (user_id, title, description, type, link_to)
        VALUES (request.user_id, 'Withdrawal Rejected', 'Your withdrawal request for ₹' || request.amount::text || ' was rejected. Reason: ' || p_notes, 'error', '/withdrawals');
    END IF;

    INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
    VALUES (auth.uid(), admin_user_email, 'processed_withdrawal_request', request.user_id, jsonb_build_object('request_id', p_request_id, 'new_status', p_new_status, 'amount', request.amount, 'notes', p_notes));
END;
$function$;