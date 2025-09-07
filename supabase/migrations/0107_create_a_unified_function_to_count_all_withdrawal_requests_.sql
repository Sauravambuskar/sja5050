CREATE OR REPLACE FUNCTION public.get_all_unified_withdrawal_requests_count(
    p_status_filter text DEFAULT NULL::text,
    p_search_text text DEFAULT NULL::text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    total_count bigint;
BEGIN
    SELECT INTO total_count SUM(c) FROM (
        SELECT COUNT(*) as c
        FROM public.withdrawal_requests wr
        LEFT JOIN public.profiles p ON wr.user_id = p.id
        LEFT JOIN auth.users u ON wr.user_id = u.id
        WHERE
            (p_status_filter IS NULL OR wr.status = p_status_filter) AND
            (p_search_text IS NULL OR
             COALESCE(p.full_name, '') ILIKE ('%' || p_search_text || '%') OR
             COALESCE(u.email, '') ILIKE ('%' || p_search_text || '%'))
        UNION ALL
        SELECT COUNT(*) as c
        FROM public.investment_withdrawal_requests iwr
        LEFT JOIN public.profiles p ON iwr.user_id = p.id
        LEFT JOIN auth.users u ON iwr.user_id = u.id
        WHERE
            (p_status_filter IS NULL OR iwr.status = p_status_filter) AND
            (p_search_text IS NULL OR
             COALESCE(p.full_name, '') ILIKE ('%' || p_search_text || '%') OR
             COALESCE(u.email, '') ILIKE ('%' || p_search_text || '%'))
    ) as counts;

    RETURN total_count;
END;
$$;