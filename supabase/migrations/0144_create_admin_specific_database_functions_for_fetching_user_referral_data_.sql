-- Function for admins to get commission stats for a specific user
CREATE OR REPLACE FUNCTION public.get_user_commission_stats_for_admin(p_user_id uuid)
RETURNS TABLE(total_commission_earned numeric, total_referrals bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Permission denied.';
    END IF;
    RETURN QUERY
    SELECT
        (SELECT COALESCE(SUM(cp.commission_amount), 0) FROM public.commission_payouts cp WHERE cp.recipient_user_id = p_user_id),
        (SELECT COUNT(*) FROM public.profiles p WHERE p.referrer_id = p_user_id);
END;
$function$;

-- Function for admins to get referrals for a specific user
CREATE OR REPLACE FUNCTION public.get_user_referrals_for_admin(p_user_id uuid)
RETURNS TABLE(id uuid, full_name text, join_date timestamp with time zone, kyc_status text, has_invested boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Permission denied.';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    u.created_at as join_date,
    p.kyc_status,
    (SELECT COUNT(*) > 0 FROM public.user_investments ui WHERE ui.user_id = p.id) as has_invested
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p.referrer_id = p_user_id
  ORDER BY u.created_at DESC;
END;
$function$;

-- Function for admins to get the referral code for a specific user
CREATE OR REPLACE FUNCTION public.get_user_referral_code_for_admin(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Permission denied.';
    END IF;
    RETURN (SELECT referral_code FROM public.profiles WHERE id = p_user_id);
END;
$function$;