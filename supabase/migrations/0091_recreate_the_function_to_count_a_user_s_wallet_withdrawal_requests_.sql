CREATE OR REPLACE FUNCTION public.get_my_withdrawal_requests_count()
 RETURNS bigint
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.withdrawal_requests
        WHERE user_id = auth.uid()
    );
END;
$function$