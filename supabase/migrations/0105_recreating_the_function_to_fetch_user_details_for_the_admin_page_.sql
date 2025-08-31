CREATE OR REPLACE FUNCTION public.get_all_users_details(search_text text DEFAULT NULL::text, kyc_status_filter text DEFAULT NULL::text, account_status_filter text DEFAULT NULL::text, page_limit integer DEFAULT 20, page_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, full_name text, email text, join_date timestamp with time zone, kyc_status text, role text, banned_until timestamp with time zone, last_sign_in_at timestamp with time zone, wallet_balance numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
    SELECT
        u.id,
        p.full_name,
        u.email,
        u.created_at AS join_date,
        p.kyc_status,
        p.role,
        u.banned_until,
        u.last_sign_in_at,
        w.balance as wallet_balance
    FROM
        users u
    LEFT JOIN
        profiles p ON u.id = p.id
    LEFT JOIN
        wallets w ON u.id = w.user_id
    WHERE
        (search_text IS NULL OR u.id::text ILIKE search_text || '%' OR p.full_name ILIKE '%' || search_text || '%' OR u.email ILIKE '%' || search_text || '%')
    AND
        (kyc_status_filter IS NULL OR p.kyc_status = kyc_status_filter)
    AND
        (account_status_filter IS NULL OR
         (account_status_filter = 'Active' AND (u.banned_until IS NULL OR u.banned_until <= NOW())) OR
         (account_status_filter = 'Suspended' AND u.banned_until > NOW())
        )
    ORDER BY
        u.created_at DESC
    LIMIT page_limit
    OFFSET page_offset;
$function$