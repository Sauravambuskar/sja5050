-- Ensure the receipt functions return exactly the fields used by the app, in the same order and types

DROP FUNCTION IF EXISTS public.get_my_payout_receipt(uuid, date);
CREATE OR REPLACE FUNCTION public.get_my_payout_receipt(
  p_investment_id uuid,
  p_payout_month date
) RETURNS TABLE(
  user_id uuid,
  user_name text,
  user_email text,
  member_id text,
  investment_id uuid,
  plan_name text,
  investment_amount numeric,
  monthly_profit numeric,
  payout_month date,
  paid_amount numeric,
  payment_date timestamp with time zone,
  payment_mode text,
  remarks text,
  processed_by uuid,
  processed_by_email text,
  bank_account_holder_name text,
  bank_account_number text,
  bank_ifsc_code text,
  platform_fee numeric,
  edit_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    uis.user_id,
    prof.full_name AS user_name,
    au.email AS user_email,
    prof.member_id,
    uis.id AS investment_id,
    ip.name AS plan_name,
    uis.investment_amount,
    (uis.investment_amount * (ip.annual_rate / 100.0 / 12.0))::numeric(10,2) AS monthly_profit,
    pl.payout_month,
    pl.paid_amount,
    pl.payment_date,
    pl.payment_mode,
    pl.remarks,
    pl.processed_by,
    admin_u.email AS processed_by_email,
    prof.bank_account_holder_name,
    prof.bank_account_number,
    prof.bank_ifsc_code,
    pl.platform_fee,
    pl.edit_reason
  FROM public.user_investments uis
  JOIN public.investment_plans ip ON uis.plan_id = ip.id
  JOIN public.profiles prof ON uis.user_id = prof.id
  JOIN auth.users au ON au.id = uis.user_id
  LEFT JOIN public.payout_log pl
    ON pl.investment_id = uis.id
   AND pl.payout_month = date_trunc('month', p_payout_month)::date
  LEFT JOIN auth.users admin_u ON admin_u.id = pl.processed_by
  WHERE uis.id = p_investment_id
    AND uis.user_id = auth.uid();
END;
$function$;

DROP FUNCTION IF EXISTS public.get_payout_receipt_for_admin(uuid, date);
CREATE OR REPLACE FUNCTION public.get_payout_receipt_for_admin(
  p_investment_id uuid,
  p_payout_month date
) RETURNS TABLE(
  user_id uuid,
  user_name text,
  user_email text,
  member_id text,
  investment_id uuid,
  plan_name text,
  investment_amount numeric,
  monthly_profit numeric,
  payout_month date,
  paid_amount numeric,
  payment_date timestamp with time zone,
  payment_mode text,
  remarks text,
  processed_by uuid,
  processed_by_email text,
  bank_account_holder_name text,
  bank_account_number text,
  bank_ifsc_code text,
  platform_fee numeric,
  edit_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied. Must be an admin.';
  END IF;

  RETURN QUERY
  SELECT
    uis.user_id,
    prof.full_name AS user_name,
    au.email AS user_email,
    prof.member_id,
    uis.id AS investment_id,
    ip.name AS plan_name,
    uis.investment_amount,
    (uis.investment_amount * (ip.annual_rate / 100.0 / 12.0))::numeric(10,2) AS monthly_profit,
    pl.payout_month,
    pl.paid_amount,
    pl.payment_date,
    pl.payment_mode,
    pl.remarks,
    pl.processed_by,
    admin_u.email AS processed_by_email,
    prof.bank_account_holder_name,
    prof.bank_account_number,
    prof.bank_ifsc_code,
    pl.platform_fee,
    pl.edit_reason
  FROM public.user_investments uis
  JOIN public.investment_plans ip ON uis.plan_id = ip.id
  JOIN public.profiles prof ON uis.user_id = prof.id
  JOIN auth.users au ON au.id = uis.user_id
  LEFT JOIN public.payout_log pl
    ON pl.investment_id = uis.id
   AND pl.payout_month = date_trunc('month', p_payout_month)::date
  LEFT JOIN auth.users admin_u ON admin_u.id = pl.processed_by
  WHERE uis.id = p_investment_id;
END;
$function$;