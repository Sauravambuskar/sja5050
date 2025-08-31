-- Recreate the function for admins to get all requests, now with robust LEFT JOINs
CREATE OR REPLACE FUNCTION public.get_all_investment_withdrawal_requests(p_status_filter text DEFAULT NULL::text, p_search_text text DEFAULT NULL::text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(request_id uuid, user_id uuid, user_name text, user_email text, plan_name text, investment_amount numeric, requested_amount numeric, investment_start_date date, requested_at timestamp with time zone, status text, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        iwr.id,
        iwr.user_id,
        COALESCE(p.full_name, 'Deleted User'),
        COALESCE(u.email, 'N/A'),
        COALESCE(ip.name, 'Deleted Plan'),
        COALESCE(ui.investment_amount, 0),
        iwr.amount,
        ui.start_date,
        iwr.created_at,
        iwr.status,
        iwr.reason
    FROM public.investment_withdrawal_requests iwr
    LEFT JOIN public.user_investments ui ON iwr.investment_id = ui.id
    LEFT JOIN public.investment_plans ip ON ui.plan_id = ip.id
    LEFT JOIN public.profiles p ON iwr.user_id = p.id
    LEFT JOIN auth.users u ON iwr.user_id = u.id
    WHERE (p_status_filter IS NULL OR iwr.status = p_status_filter)
      AND (p_search_text IS NULL OR (COALESCE(p.full_name, '') ILIKE ('%' || p_search_text || '%') OR COALESCE(u.email, '') ILIKE ('%' || p_search_text || '%')))
    ORDER BY CASE iwr.status WHEN 'Pending' THEN 1 ELSE 2 END, iwr.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- Recreate the count function to match the main function's logic
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
        LEFT JOIN public.profiles p ON iwr.user_id = p.id
        LEFT JOIN auth.users u ON iwr.user_id = u.id
        WHERE (p_status_filter IS NULL OR iwr.status = p_status_filter)
          AND (p_search_text IS NULL OR
               COALESCE(p.full_name, '') ILIKE ('%' || p_search_text || '%') OR
               COALESCE(u.email, '') ILIKE ('%' || p_search_text || '%'))
    );
END;
$function$;