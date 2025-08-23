CREATE OR REPLACE FUNCTION public.get_all_users_details_count(search_text text DEFAULT NULL::text, kyc_status_filter text DEFAULT NULL::text, account_status_filter text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
    SELECT COUNT(*)
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE
        (search_text IS NULL OR u.id::text ILIKE search_text || '%' OR p.full_name ILIKE '%' || search_text || '%' OR u.email ILIKE '%' || search_text || '%')
    AND
        (kyc_status_filter IS NULL OR p.kyc_status = kyc_status_filter)
    AND
        (account_status_filter IS NULL OR
         (account_status_filter = 'Active' AND (u.banned_until IS NULL OR u.banned_until <= NOW())) OR
         (account_status_filter = 'Suspended' AND u.banned_until > NOW())
        )
$function$