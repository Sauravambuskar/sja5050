CREATE OR REPLACE FUNCTION public.get_all_withdrawal_requests_count(p_status_filter text DEFAULT NULL::text, p_search_text text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.withdrawal_requests wr
        LEFT JOIN public.profiles p ON wr.user_id = p.id
        LEFT JOIN auth.users u ON wr.user_id = u.id
        WHERE
            (p_status_filter IS NULL OR wr.status = p_status_filter) AND
            (p_search_text IS NULL OR
             COALESCE(p.full_name, '') ILIKE ('%' || p_search_text || '%') OR
             COALESCE(u.email, '') ILIKE ('%' || p_search_text || '%'))
    );
END;
$function$;