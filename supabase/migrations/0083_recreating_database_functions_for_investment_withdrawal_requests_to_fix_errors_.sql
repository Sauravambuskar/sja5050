-- Function to get paginated and filtered investment withdrawal requests
CREATE OR REPLACE FUNCTION public.get_all_investment_withdrawal_requests(p_status_filter text DEFAULT NULL::text, p_search_text text DEFAULT NULL::text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(request_id uuid, user_id uuid, user_name text, user_email text, plan_name text, investment_amount numeric, investment_start_date date, requested_at timestamp with time zone, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        iwr.id,
        iwr.user_id,
        p.full_name,
        u.email,
        ip.name,
        ui.investment_amount,
        ui.start_date,
        iwr.created_at,
        iwr.status
    FROM public.investment_withdrawal_requests iwr
    JOIN public.user_investments ui ON iwr.investment_id = ui.id
    JOIN public.investment_plans ip ON ui.plan_id = ip.id
    JOIN public.profiles p ON iwr.user_id = p.id
    JOIN auth.users u ON iwr.user_id = u.id
    WHERE 
        (p_status_filter IS NULL OR iwr.status = p_status_filter) AND
        (p_search_text IS NULL OR
         COALESCE(p.full_name, '') ILIKE ('%' || p_search_text || '%') OR
         COALESCE(u.email, '') ILIKE ('%' || p_search_text || '%'))
    ORDER BY CASE iwr.status WHEN 'Pending' THEN 1 ELSE 2 END, iwr.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$;

-- Function to count investment withdrawal requests
CREATE OR REPLACE FUNCTION public.get_all_investment_withdrawal_requests_count(p_status_filter text DEFAULT NULL::text, p_search_text text DEFAULT NULL::text)
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
$function$;