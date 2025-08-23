CREATE OR REPLACE FUNCTION public.get_payout_report(start_date_filter date, end_date_filter date)
 RETURNS TABLE(user_id uuid, user_name text, investment_id uuid, plan_name text, investment_amount numeric, start_date date, maturity_date date, monthly_profit numeric, status text, bank_account_holder_name text, bank_account_number text, bank_ifsc_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        p.id as user_id,
        p.full_name as user_name,
        ui.id as investment_id,
        ip.name as plan_name,
        ui.investment_amount,
        ui.start_date,
        ui.maturity_date,
        -- Calculate monthly profit based on annual rate
        (ui.investment_amount * (ip.annual_rate / 100.0 / 12.0))::numeric(10, 2) as monthly_profit,
        ui.status,
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
        -- The investment must be 'Active'
        ui.status = 'Active' AND
        -- And it must have started before the end of the report month
        ui.start_date <= end_date_filter AND
        -- And it must mature after the start of the report month
        ui.maturity_date >= start_date_filter
    ORDER BY
        p.full_name ASC;
END;
$function$