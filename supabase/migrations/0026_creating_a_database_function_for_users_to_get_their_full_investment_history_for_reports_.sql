CREATE OR REPLACE FUNCTION public.get_my_full_investment_history()
RETURNS TABLE(
    plan_name text,
    investment_amount numeric,
    start_date date,
    maturity_date date,
    status text,
    profit_earned numeric,
    total_payout numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ip.name as plan_name,
        ui.investment_amount,
        ui.start_date,
        ui.maturity_date,
        ui.status,
        CASE
            WHEN ui.status = 'Matured' THEN
                (ui.investment_amount * (ip.annual_rate / 100.0) * (EXTRACT(DAY FROM ui.maturity_date - ui.start_date) / 365.0))::numeric(10, 2)
            ELSE 0
        END as profit_earned,
        CASE
            WHEN ui.status = 'Matured' THEN
                (ui.investment_amount + (ui.investment_amount * (ip.annual_rate / 100.0) * (EXTRACT(DAY FROM ui.maturity_date - ui.start_date) / 365.0)))::numeric(10, 2)
            ELSE ui.investment_amount
        END as total_payout
    FROM
        public.user_investments ui
    JOIN
        public.investment_plans ip ON ui.plan_id = ip.id
    WHERE
        ui.user_id = auth.uid()
    ORDER BY
        ui.start_date DESC;
END;
$$;