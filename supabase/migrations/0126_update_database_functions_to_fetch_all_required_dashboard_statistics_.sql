-- Dropping the old function to change its return type and fix the error
DROP FUNCTION IF EXISTS public.get_dashboard_stats();

-- Recreating the function to include walletBalance
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
 RETURNS TABLE("fullName" text, "activeInvestmentsCount" bigint, "totalInvested" numeric, "kycStatus" text, "referralCount" bigint, "walletBalance" numeric)
 LANGUAGE plpgsql
AS $function$
DECLARE
    user_profile public.profiles;
BEGIN
    SELECT * INTO user_profile FROM public.profiles WHERE id = auth.uid();
    RETURN QUERY
    SELECT
        COALESCE(user_profile.full_name, (SELECT u.raw_user_meta_data->>'full_name' FROM auth.users u WHERE u.id = auth.uid())) as "fullName",
        (SELECT COUNT(*) FROM public.user_investments ui WHERE ui.user_id = auth.uid() AND ui.status = 'Active') as "activeInvestmentsCount",
        (SELECT COALESCE(SUM(ui.investment_amount), 0) FROM public.user_investments ui WHERE ui.user_id = auth.uid() AND ui.status = 'Active') as "totalInvested",
        COALESCE(user_profile.kyc_status, 'Not Submitted') as "kycStatus",
        (SELECT COUNT(*) FROM public.profiles ref WHERE ref.referrer_id = auth.uid()) as "referralCount",
        (SELECT COALESCE(w.balance, 0) FROM public.wallets w WHERE w.user_id = auth.uid()) as "walletBalance";
END;
$function$;

-- Create a new function to get extended stats in one call
CREATE OR REPLACE FUNCTION public.get_my_extended_dashboard_stats()
RETURNS TABLE(total_investment_return numeric, total_referral_commission numeric)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM public.transactions WHERE user_id = auth.uid() AND type = 'Investment Payout') as total_investment_return,
        (SELECT COALESCE(SUM(commission_amount), 0) FROM public.commission_payouts WHERE recipient_user_id = auth.uid()) as total_referral_commission;
END;
$$;