CREATE OR REPLACE FUNCTION public.get_client_investor_payment_details(p_user_id uuid)
RETURNS TABLE(
    invt_id text,
    invt_date date,
    invt_amount numeric,
    rate numeric,
    per_day_amount numeric,
    total_days integer,
    total_interest numeric,
    month_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Permission denied. Must be an admin.';
    END IF;

    RETURN QUERY
    SELECT
        SUBSTRING(ui.id::text, 1, 8) as invt_id,
        ui.start_date as invt_date,
        ui.investment_amount as invt_amount,
        (ip.annual_rate / 12.0)::numeric(10, 2) as rate,
        (ui.investment_amount * (ip.annual_rate / 100.0 / 365.0))::numeric(10, 2) as per_day_amount,
        EXTRACT(DAY FROM AGE(CURRENT_DATE, date_trunc('month', CURRENT_DATE)))::integer + 1 as total_days,
        (ui.investment_amount * (ip.annual_rate / 100.0 / 365.0) * (EXTRACT(DAY FROM AGE(CURRENT_DATE, date_trunc('month', CURRENT_DATE)))::integer + 1))::numeric(10, 2) as total_interest,
        (ui.investment_amount * (ip.annual_rate / 100.0 / 12.0))::numeric(10, 2) as month_amount
    FROM
        public.user_investments ui
    JOIN
        public.investment_plans ip ON ui.plan_id = ip.id
    WHERE
        ui.user_id = p_user_id AND ui.status = 'Active';
END;
$$;