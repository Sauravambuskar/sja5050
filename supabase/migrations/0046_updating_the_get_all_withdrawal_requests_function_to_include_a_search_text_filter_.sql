CREATE OR REPLACE FUNCTION public.get_all_withdrawal_requests(
    p_limit integer DEFAULT 10,
    p_offset integer DEFAULT 0,
    p_status_filter text DEFAULT NULL::text,
    p_search_text text DEFAULT NULL::text
)
 RETURNS TABLE(request_id uuid, user_name text, user_id uuid, user_email text, amount numeric, requested_at timestamp with time zone, status text, bank_account_holder_name text, bank_account_number text, bank_ifsc_code text, wallet_balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        wr.id AS request_id,
        p.full_name AS user_name,
        wr.user_id,
        u.email AS user_email,
        wr.amount,
        wr.requested_at,
        wr.status,
        p.bank_account_holder_name,
        p.bank_account_number,
        p.bank_ifsc_code,
        COALESCE(w.balance, 0.00) as wallet_balance
    FROM
        public.withdrawal_requests wr
    LEFT JOIN
        public.profiles p ON wr.user_id = p.id
    LEFT JOIN
        auth.users u ON wr.user_id = u.id
    LEFT JOIN
        public.wallets w ON wr.user_id = w.user_id
    WHERE
        (p_status_filter IS NULL OR wr.status = p_status_filter)
        AND (p_search_text IS NULL OR p.full_name ILIKE '%' || p_search_text || '%' OR u.email ILIKE '%' || p_search_text || '%')
    ORDER BY
        CASE wr.status WHEN 'Pending' THEN 1 ELSE 2 END,
        wr.requested_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$