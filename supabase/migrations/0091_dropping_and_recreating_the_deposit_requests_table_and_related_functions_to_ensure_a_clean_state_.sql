-- Drop the existing table and its dependent objects
DROP TABLE IF EXISTS public.deposit_requests CASCADE;

-- Create deposit_requests table
CREATE TABLE public.deposit_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    reference_id text NOT NULL,
    screenshot_path text NULL,
    status text NOT NULL DEFAULT 'Pending'::text,
    requested_at timestamp with time zone NULL DEFAULT now(),
    admin_notes text NULL,
    reviewed_at timestamp with time zone NULL,
    reviewed_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own deposit requests" ON public.deposit_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create deposit requests" ON public.deposit_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all deposit requests" ON public.deposit_requests FOR ALL TO authenticated USING (public.is_admin());

-- Function to get all deposit requests for admin view
CREATE OR REPLACE FUNCTION public.get_all_deposit_requests(p_status_filter text DEFAULT NULL::text, p_search_text text DEFAULT NULL::text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(request_id uuid, user_name text, user_id uuid, user_email text, amount numeric, reference_id text, requested_at timestamp with time zone, status text, screenshot_path text, admin_notes text, wallet_balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Permission denied. Must be an admin.';
    END IF;

    RETURN QUERY
    SELECT
        dr.id AS request_id,
        COALESCE(p.full_name, 'Deleted User') AS user_name,
        dr.user_id,
        COALESCE(u.email, 'N/A') AS user_email,
        dr.amount,
        dr.reference_id,
        dr.requested_at,
        dr.status,
        dr.screenshot_path,
        dr.admin_notes,
        COALESCE(w.balance, 0.00) as wallet_balance
    FROM
        public.deposit_requests dr
    LEFT JOIN
        public.profiles p ON dr.user_id = p.id
    LEFT JOIN
        auth.users u ON dr.user_id = u.id
    LEFT JOIN
        public.wallets w ON dr.user_id = w.user_id
    WHERE
        (p_status_filter IS NULL OR dr.status = p_status_filter) AND
        (p_search_text IS NULL OR
         COALESCE(p.full_name, '') ILIKE ('%' || p_search_text || '%') OR
         COALESCE(u.email, '') ILIKE ('%' || p_search_text || '%') OR
         dr.reference_id ILIKE ('%' || p_search_text || '%'))
    ORDER BY
        CASE dr.status WHEN 'Pending' THEN 1 ELSE 2 END,
        dr.requested_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$;

-- Function to count all deposit requests for admin view
CREATE OR REPLACE FUNCTION public.get_all_deposit_requests_count(p_status_filter text DEFAULT NULL::text, p_search_text text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Permission denied. Must be an admin.';
    END IF;

    RETURN (
        SELECT COUNT(*)
        FROM public.deposit_requests dr
        LEFT JOIN public.profiles p ON dr.user_id = p.id
        LEFT JOIN auth.users u ON dr.user_id = u.id
        WHERE
            (p_status_filter IS NULL OR dr.status = p_status_filter) AND
            (p_search_text IS NULL OR
             COALESCE(p.full_name, '') ILIKE ('%' || p_search_text || '%') OR
             COALESCE(u.email, '') ILIKE ('%' || p_search_text || '%') OR
             dr.reference_id ILIKE ('%' || p_search_text || '%'))
    );
END;
$function$;

-- Function for admin to process a deposit request
CREATE OR REPLACE FUNCTION public.process_deposit_request(request_id_to_process uuid, new_status text, notes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    target_user_id UUID;
    deposit_amount NUMERIC;
    admin_user_email TEXT;
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Permission denied. Must be an admin.';
    END IF;

    SELECT email INTO admin_user_email FROM auth.users WHERE id = auth.uid();

    UPDATE public.deposit_requests
    SET
        status = new_status,
        admin_notes = notes,
        reviewed_at = NOW(),
        reviewed_by = auth.uid()
    WHERE id = request_id_to_process
    RETURNING user_id, amount INTO target_user_id, deposit_amount;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deposit request not found.';
    END IF;

    IF new_status = 'Approved' THEN
        UPDATE public.wallets
        SET balance = balance + deposit_amount
        WHERE user_id = target_user_id;

        INSERT INTO public.transactions (user_id, type, amount, description, status)
        VALUES (target_user_id, 'Deposit', deposit_amount, 'Manual deposit approved by admin.', 'Completed');

        INSERT INTO public.notifications (user_id, title, description, type, link_to)
        VALUES (target_user_id, 'Deposit Approved', 'Your deposit of ₹' || deposit_amount::text || ' has been approved and added to your wallet.', 'success', '/wallet');
    ELSE
        INSERT INTO public.notifications (user_id, title, description, type, link_to)
        VALUES (target_user_id, 'Deposit Rejected', 'Your deposit request was rejected. Reason: ' || notes, 'error', '/wallet');
    END IF;

    INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
    VALUES (auth.uid(), admin_user_email, 'processed_deposit_request', target_user_id, jsonb_build_object('request_id', request_id_to_process, 'new_status', new_status, 'notes', notes));
END;
$function$;