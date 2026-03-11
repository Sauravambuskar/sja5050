CREATE OR REPLACE FUNCTION public.get_my_referral_client_ledger()
RETURNS TABLE(
  customer_user_id uuid,
  referral_member_id text,
  customer_member_id text,
  investment_id uuid,
  investment_date date,
  customer_name text,
  commission_rate numeric,
  investment_amount numeric,
  monthly_return numeric,
  daily_return numeric,
  duration_days integer,
  payment numeric,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS customer_user_id,
    me.member_id AS referral_member_id,
    p.member_id AS customer_member_id,
    ui.id AS investment_id,
    ui.start_date AS investment_date,
    p.full_name AS customer_name,
    COALESCE(cr.rate, 0) AS commission_rate,
    ui.investment_amount AS investment_amount,
    ROUND(((ui.investment_amount * COALESCE(ip.annual_rate, 0)) / 100 / 12)::numeric, 2) AS monthly_return,
    ROUND((((ui.investment_amount * COALESCE(ip.annual_rate, 0)) / 100 / 12) / 30)::numeric, 2) AS daily_return,
    COALESCE(ip.duration_months, 0) * 30 AS duration_days,
    COALESCE((
      SELECT SUM(cp.commission_amount)
      FROM public.commission_payouts cp
      WHERE cp.recipient_user_id = auth.uid()
        AND cp.source_user_id = p.id
        AND cp.source_investment_id = ui.id
        AND cp.referral_level = 1
    ), 0) AS payment,
    ui.status AS status
  FROM public.profiles me
  JOIN public.profiles p ON p.referrer_id = auth.uid()
  JOIN public.user_investments ui ON ui.user_id = p.id
  LEFT JOIN public.investment_plans ip ON ip.id = ui.plan_id
  LEFT JOIN public.commission_rules cr ON cr.level = 1 AND COALESCE(cr.is_active, true)
  WHERE me.id = auth.uid()
  ORDER BY ui.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_referral_client_ledger() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_user_referral_client_ledger_for_admin(p_user_id uuid)
RETURNS TABLE(
  customer_user_id uuid,
  referral_member_id text,
  customer_member_id text,
  investment_id uuid,
  investment_date date,
  customer_name text,
  commission_rate numeric,
  investment_amount numeric,
  monthly_return numeric,
  daily_return numeric,
  duration_days integer,
  payment numeric,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS customer_user_id,
    me.member_id AS referral_member_id,
    p.member_id AS customer_member_id,
    ui.id AS investment_id,
    ui.start_date AS investment_date,
    p.full_name AS customer_name,
    COALESCE(cr.rate, 0) AS commission_rate,
    ui.investment_amount AS investment_amount,
    ROUND(((ui.investment_amount * COALESCE(ip.annual_rate, 0)) / 100 / 12)::numeric, 2) AS monthly_return,
    ROUND((((ui.investment_amount * COALESCE(ip.annual_rate, 0)) / 100 / 12) / 30)::numeric, 2) AS daily_return,
    COALESCE(ip.duration_months, 0) * 30 AS duration_days,
    COALESCE((
      SELECT SUM(cp.commission_amount)
      FROM public.commission_payouts cp
      WHERE cp.recipient_user_id = p_user_id
        AND cp.source_user_id = p.id
        AND cp.source_investment_id = ui.id
        AND cp.referral_level = 1
    ), 0) AS payment,
    ui.status AS status
  FROM public.profiles me
  JOIN public.profiles p ON p.referrer_id = p_user_id
  JOIN public.user_investments ui ON ui.user_id = p.id
  LEFT JOIN public.investment_plans ip ON ip.id = ui.plan_id
  LEFT JOIN public.commission_rules cr ON cr.level = 1 AND COALESCE(cr.is_active, true)
  WHERE me.id = p_user_id
  ORDER BY ui.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_referral_client_ledger_for_admin(uuid) TO authenticated;