CREATE OR REPLACE FUNCTION public.get_all_withdrawal_requests_count(p_status_filter text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.withdrawal_requests wr
        WHERE (p_status_filter IS NULL OR wr.status = p_status_filter)
    );
END;
$function$