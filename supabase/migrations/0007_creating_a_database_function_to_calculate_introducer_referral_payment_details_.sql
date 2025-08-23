CREATE OR REPLACE FUNCTION public.get_client_introducer_payment_details(p_user_id uuid)
RETURNS TABLE(
    invt_id text,
    name text,
    amount numeric,
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
        SUBSTRING(cp.source_investment_id::text, 1, 8) as invt_id,
        p.full_name as name,
        ui.investment_amount as amount,
        cr.rate,
        (cp.commission_amount / 30.0)::numeric(10, 2) as per_day_amount,
        EXTRACT(DAY FROM AGE(CURRENT_DATE, date_trunc('month', CURRENT_DATE)))::integer + 1 as total_days,
        (cp.commission_amount / 30.0 * (EXTRACT(DAY FROM AGE(CURRENT_DATE, date_trunc('month', CURRENT_DATE)))::integer + 1))::numeric(10, 2) as total_interest,
        cp.commission_amount as month_amount
    FROM
        public.commission_payouts cp
    JOIN
        public.profiles p ON cp.source_user_id = p.id
    JOIN
        public.user_investments ui ON cp.source_investment_id = ui.id
    JOIN
        public.commission_rules cr ON cp.referral_level = cr.level
    WHERE
        cp.recipient_user_id = p_user_id
        AND date_trunc('month', cp.payout_date) = date_trunc('month', CURRENT_DATE);
END;
$$;