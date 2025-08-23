CREATE OR REPLACE FUNCTION public.get_all_deposit_requests_count(p_status_filter text DEFAULT NULL::text, p_search_text text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
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
$function$