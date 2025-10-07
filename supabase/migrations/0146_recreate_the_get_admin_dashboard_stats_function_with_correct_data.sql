CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE(
  total_users bigint,
  aum numeric,
  pending_kyc bigint,
  pending_withdrawals_count bigint,
  pending_deposits_count bigint,
  pending_deposits_value numeric,
  pending_investments_count bigint,
  pending_investments_value numeric,
  monthly_payout_projection numeric,
  pending_cancellations_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COALESCE(SUM(investment_amount), 0) FROM public.user_investments WHERE status = 'Active') as aum,
    (SELECT COUNT(*) FROM public.kyc_documents WHERE status = 'Pending') as pending_kyc,
    (SELECT COUNT(*) FROM public.withdrawal_requests WHERE status = 'Pending') as pending_withdrawals_count,
    (SELECT COUNT(*) FROM public.investment_requests WHERE status = 'Pending' AND screenshot_path IS NOT NULL) as pending_deposits_count,
    (SELECT COALESCE(SUM(amount), 0) FROM public.investment_requests WHERE status = 'Pending' AND screenshot_path IS NOT NULL) as pending_deposits_value,
    (SELECT COUNT(*) FROM public.investment_requests WHERE status = 'Pending') as pending_investments_count,
    (SELECT COALESCE(SUM(amount), 0) FROM public.investment_requests WHERE status = 'Pending') as pending_investments_value,
    (SELECT COALESCE(SUM(ui.investment_amount * (ip.annual_rate / 100.0 / 12.0)), 0) FROM public.user_investments ui JOIN public.investment_plans ip ON ui.plan_id = ip.id WHERE ui.status = 'Active') as monthly_payout_projection,
    (SELECT COUNT(*) FROM public.investment_cancellation_requests WHERE status = 'Pending') as pending_cancellations_count;
END;
$function$;