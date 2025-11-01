-- 1) Ensure columns exist
ALTER TABLE public.payout_log
  ADD COLUMN IF NOT EXISTS platform_fee numeric,
  ADD COLUMN IF NOT EXISTS edit_reason text;

-- 2) Recreate record_payout with exact params used by the app
DROP FUNCTION IF EXISTS public.record_payout(uuid, date, text, numeric, text, text);
CREATE OR REPLACE FUNCTION public.record_payout(
  p_investment_id uuid,
  p_payout_month date,
  p_status text,
  p_paid_amount numeric,
  p_payment_mode text,
  p_remarks text,
  p_platform_fee numeric DEFAULT NULL,
  p_edit_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inv record;
  user_name text;
  link_month text;
BEGIN
  IF NOT is_admin() THEN
      RAISE EXCEPTION 'Permission denied. Must be an admin.';
  END IF;

  -- Upsert payout log (include platform fee and edit reason)
  INSERT INTO public.payout_log (
      investment_id,
      payout_month,
      status,
      paid_amount,
      payment_date,
      payment_mode,
      remarks,
      processed_by,
      processed_at,
      platform_fee,
      edit_reason
  )
  VALUES (
      p_investment_id,
      p_payout_month,
      p_status,
      p_paid_amount,
      CASE WHEN p_status = 'Paid' THEN NOW() ELSE NULL END,
      p_payment_mode,
      p_remarks,
      auth.uid(),
      NOW(),
      p_platform_fee,
      p_edit_reason
  )
  ON CONFLICT (investment_id, payout_month)
  DO UPDATE SET
      status = EXCLUDED.status,
      paid_amount = EXCLUDED.paid_amount,
      payment_date = EXCLUDED.payment_date,
      payment_mode = EXCLUDED.payment_mode,
      remarks = EXCLUDED.remarks,
      processed_by = EXCLUDED.processed_by,
      processed_at = EXCLUDED.processed_at,
      platform_fee = EXCLUDED.platform_fee,
      edit_reason = EXCLUDED.edit_reason;

  -- If marked Paid, create notifications with receipt links
  IF p_status = 'Paid' THEN
    SELECT ui.*, ip.name INTO inv
    FROM public.user_investments ui
    JOIN public.investment_plans ip ON ip.id = ui.plan_id
    WHERE ui.id = p_investment_id;

    SELECT p.full_name INTO user_name FROM public.profiles p WHERE p.id = inv.user_id;
    link_month := to_char(date_trunc('month', p_payout_month)::date, 'YYYY-MM');

    INSERT INTO public.notifications (user_id, title, description, type, link_to)
    VALUES (
      inv.user_id,
      'Payout Paid',
      'Your monthly payout for ' || coalesce(inv.name, 'Investment') || ' (' || to_char(p_payout_month, 'Mon YYYY') || ') has been paid. Amount: ₹' || coalesce(p_paid_amount, 0)::text,
      'success',
      '/receipts/payout/' || p_investment_id::text || '/' || link_month
    );

    INSERT INTO public.notifications (user_id, title, description, type, link_to)
    VALUES (
      auth.uid(),
      'Payout Receipt Created',
      'Receipt generated for ' || coalesce(user_name, 'User') || ' - ' || coalesce(inv.name, 'Investment') || ' (' || to_char(p_payout_month, 'Mon YYYY') || ').',
      'info',
      '/admin/receipts/payout/' || p_investment_id::text || '/' || link_month
    );
  END IF;
END;
$function$;

-- 3) Recreate admin receipt to include platform_fee and edit_reason
DROP FUNCTION IF EXISTS public.get_payout_receipt_for_admin(uuid, date);
CREATE FUNCTION public.get_payout_receipt_for_admin(
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

-- 4) Recreate user receipt to include platform_fee and edit_reason
DROP FUNCTION IF EXISTS public.get_my_payout_receipt(uuid, date);
CREATE FUNCTION public.get_my_payout_receipt(
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