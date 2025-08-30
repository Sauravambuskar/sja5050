CREATE OR REPLACE FUNCTION public.get_my_active_investments_for_withdrawal()
RETURNS TABLE(
    id uuid,
    plan_name text,
    investment_amount numeric,
    start_date date,
    maturity_date date,
    status text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ui.id,
        ip.name as plan_name,
        ui.investment_amount,
        ui.start_date,
        ui.maturity_date,
        ui.status
    FROM
        public.user_investments ui
    JOIN
        public.investment_plans ip ON ui.plan_id = ip.id
    WHERE
        ui.user_id = auth.uid() AND ui.status = 'Active';
END;
$$;