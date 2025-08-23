CREATE OR REPLACE FUNCTION public.get_all_deposit_requests(
    p_status_filter text DEFAULT NULL::text,
    p_search_text text DEFAULT NULL::text,
    p_limit integer DEFAULT 10,
    p_offset integer DEFAULT 0
)
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
$function$