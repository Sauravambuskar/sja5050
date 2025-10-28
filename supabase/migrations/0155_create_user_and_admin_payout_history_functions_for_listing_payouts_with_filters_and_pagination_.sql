CREATE OR REPLACE FUNCTION public.get_my_payout_history(
  page_limit integer DEFAULT 10,
  page_offset integer DEFAULT 0,
  status_filter text DEFAULT NULL,
  month_filter date DEFAULT NULL
)
RETURNS TABLE(
  investment_id uuid,
  plan_name text,
  payout_month date,
  status text,
  paid_amount numeric,
  payment_date timestamp with time zone,
  payment_mode text,
  remarks text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    pl.investment_id,
    ip.name AS plan_name,
    pl.payout_month,
    pl.status,
    pl.paid_amount,
    pl.payment_date,
    pl.payment_mode,
    pl.remarks
  FROM public.payout_log pl
  JOIN public.user_investments ui ON ui.id = pl.investment_id
  JOIN public.investment_plans ip ON ip.id = ui.plan_id
  WHERE ui.user_id = auth.uid()
    AND (status_filter IS NULL OR pl.status = status_filter)
    AND (month_filter IS NULL OR date_trunc('month', pl.payout_month) = date_trunc('month', month_filter))
  ORDER BY pl.payout_month DESC, pl.payment_date DESC NULLS LAST
  LIMIT page_limit OFFSET page_offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_payout_history(
  p_status_filter text DEFAULT NULL,
  p_month_filter date DEFAULT NULL,
  p_search_text text DEFAULT NULL,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  user_email text,
  member_id text,
  investment_id uuid,
  plan_name text,
  payout_month date,
  status text,
  paid_amount numeric,
  payment_date timestamp with time zone,
  payment_mode text,
  remarks text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','auth'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied. Must be an admin.';
  END IF;

  RETURN QUERY
  SELECT
    ui.user_id,
    p.full_name AS user_name,
    u.email AS user_email,
    p.member_id,
    pl.investment_id,
    ip.name AS plan_name,
    pl.payout_month,
    pl.status,
    pl.paid_amount,
    pl.payment_date,
    pl.payment_mode,
    pl.remarks
  FROM public.payout_log pl
  JOIN public.user_investments ui ON ui.id = pl.investment_id
  JOIN public.investment_plans ip ON ip.id = ui.plan_id
  JOIN public.profiles p ON p.id = ui.user_id
  JOIN auth.users u ON u.id = ui.user_id
  WHERE
    (p_status_filter IS NULL OR pl.status = p_status_filter)
    AND (p_month_filter IS NULL OR date_trunc('month', pl.payout_month) = date_trunc('month', p_month_filter))
    AND (p_search_text IS NULL OR
         p.full_name ILIKE '%' || p_search_text || '%' OR
         u.email ILIKE '%' || p_search_text || '%' OR
         p.member_id ILIKE '%' || p_search_text || '%')
  ORDER BY pl.payout_month DESC, pl.payment_date DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
END;
$function$;