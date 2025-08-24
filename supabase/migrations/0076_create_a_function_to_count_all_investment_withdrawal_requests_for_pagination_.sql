CREATE OR REPLACE FUNCTION public.get_all_investment_withdrawal_requests_count(
    p_status_filter text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.investment_withdrawal_requests iwr
        WHERE (p_status_filter IS NULL OR iwr.status = p_status_filter)
    );
END;
$function$;