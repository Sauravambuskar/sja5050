CREATE OR REPLACE FUNCTION public.get_admin_ledger(p_month_start date)
RETURNS TABLE(
    user_id uuid,
    user_name text,
    investment_id uuid,
    plan_name text,
    investment_amount numeric,
    start_date date,
    maturity_date date,
    monthly_payout numeric,
    daily_payout numeric,
    days_in_period integer,
    accrued_in_period numeric,
    bank_account_holder_name text,
    bank_account_number text,
    bank_ifsc_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    end_of_month date;
    calculation_end_date date;
BEGIN
    end_of_month := (p_month_start + interval '1 month' - interval '1 day')::date;

    -- If the selected month is the current month, calculate up to today. For past months, calculate for the full month. For future months, show 0.
    IF date_trunc('month', p_month_start) > date_trunc('month', CURRENT_DATE) THEN
        calculation_end_date := p_month_start - interval '1 day'; -- Will result in 0 days
    ELSIF date_trunc('month', p_month_start) = date_trunc('month', CURRENT_DATE) THEN
        calculation_end_date := CURRENT_DATE;
    ELSE
        calculation_end_date := end_of_month;
    END IF;

    RETURN QUERY
    SELECT
        p.id as user_id,
        p.full_name as user_name,
        ui.id as investment_id,
        ip.name as plan_name,
        ui.investment_amount,
        ui.start_date,
        ui.maturity_date,
        -- Full potential monthly payout
        (ui.investment_amount * (ip.annual_rate / 100.0 / 12.0))::numeric(10, 2) as monthly_payout,
        -- Daily Payout
        (ui.investment_amount * (ip.annual_rate / 100.0 / 365.0))::numeric(10, 2) as daily_payout,
        -- Days accrued in the calculation period
        GREATEST(0, (LEAST(calculation_end_date, ui.maturity_date, end_of_month) - GREATEST(p_month_start, ui.start_date) + 1))::integer as days_in_period,
        -- Accrued amount for the period
        (
            (ui.investment_amount * (ip.annual_rate / 100.0 / 365.0)) *
            GREATEST(0, (LEAST(calculation_end_date, ui.maturity_date, end_of_month) - GREATEST(p_month_start, ui.start_date) + 1))
        )::numeric(10, 2) as accrued_in_period,
        p.bank_account_holder_name,
        p.bank_account_number,
        p.bank_ifsc_code
    FROM
        public.user_investments ui
    JOIN
        public.profiles p ON ui.user_id = p.id
    JOIN
        public.investment_plans ip ON ui.plan_id = ip.id
    WHERE
        ui.status = 'Active' AND
        ui.start_date <= end_of_month AND
        ui.maturity_date >= p_month_start;
END;
$$;