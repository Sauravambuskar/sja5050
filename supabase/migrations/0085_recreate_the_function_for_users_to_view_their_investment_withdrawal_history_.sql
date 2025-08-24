CREATE OR REPLACE FUNCTION public.get_my_investment_withdrawal_requests()
 RETURNS TABLE(request_id uuid, plan_name text, investment_amount numeric, requested_at timestamp with time zone, status text, admin_notes text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        iwr.id,
        ip.name,
        ui.investment_amount,
        iwr.created_at,
        iwr.status,
        iwr.admin_notes
    FROM public.investment_withdrawal_requests iwr
    JOIN public.user_investments ui ON iwr.investment_id = ui.id
    JOIN public.investment_plans ip ON ui.plan_id = ip.id
    WHERE iwr.user_id = auth.uid()
    ORDER BY iwr.created_at DESC;
END;
$function$