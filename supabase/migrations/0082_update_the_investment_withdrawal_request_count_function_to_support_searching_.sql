CREATE OR REPLACE FUNCTION public.get_all_investment_withdrawal_requests_count(p_status_filter text DEFAULT NULL, p_search_text text DEFAULT NULL)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.investment_withdrawal_requests iwr
        JOIN public.profiles p ON iwr.user_id = p.id
        JOIN auth.users u ON iwr.user_id = u.id
        WHERE 
            (p_status_filter IS NULL OR iwr.status = p_status_filter) AND
            (p_search_text IS NULL OR
             COALESCE(p.full_name, '') ILIKE ('%' || p_search_text || '%') OR
             COALESCE(u.email, '') ILIKE ('%' || p_search_text || '%'))
    );
END;
$function$