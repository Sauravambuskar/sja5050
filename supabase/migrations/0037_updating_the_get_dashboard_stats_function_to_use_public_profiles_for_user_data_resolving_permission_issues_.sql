CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
 RETURNS TABLE("fullName" text, "activeInvestmentsCount" bigint, "totalInvested" numeric, "walletBalance" numeric, "kycStatus" text, "referralCount" bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    user_profile public.profiles;
    user_wallet public.wallets;
BEGIN
    -- Fetch profile and wallet data for the current user
    SELECT * INTO user_profile FROM public.profiles WHERE id = auth.uid();
    SELECT * INTO user_wallet FROM public.wallets WHERE user_id = auth.uid();

    -- Return the aggregated stats
    RETURN QUERY
    SELECT
        COALESCE(user_profile.full_name, auth.email()) as "fullName", -- Fallback to email if full_name is null
        (SELECT COUNT(*) FROM public.user_investments ui WHERE ui.user_id = auth.uid() AND ui.status = 'Active') as "activeInvestmentsCount",
        (SELECT COALESCE(SUM(ui.investment_amount), 0) FROM public.user_investments ui WHERE ui.user_id = auth.uid() AND ui.status = 'Active') as "totalInvested",
        COALESCE(user_wallet.balance, 0.00) as "walletBalance",
        COALESCE(user_profile.kyc_status, 'Not Submitted') as "kycStatus",
        (SELECT COUNT(*) FROM public.profiles ref WHERE ref.referrer_id = auth.uid()) as "referralCount";
END;
$function$;