-- First, update get_dashboard_stats
DROP FUNCTION IF EXISTS public.get_dashboard_stats();
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
 RETURNS TABLE("fullName" text, "activeInvestmentsCount" bigint, "totalInvested" numeric, "walletBalance" numeric, "kycStatus" text, "referralCount" bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', u.email) as "fullName",
        (SELECT COUNT(*) FROM public.user_investments ui WHERE ui.user_id = auth.uid() AND ui.status = 'Active') as "activeInvestmentsCount",
        (SELECT COALESCE(SUM(ui.investment_amount), 0) FROM public.user_investments ui WHERE ui.user_id = auth.uid() AND ui.status = 'Active') as "totalInvested",
        COALESCE(w.balance, 0.00) as "walletBalance",
        COALESCE(p.kyc_status, 'Not Submitted') as "kycStatus",
        (SELECT COUNT(*) FROM public.profiles ref WHERE ref.referrer_id = auth.uid()) as "referralCount"
    FROM
        auth.users u
    LEFT JOIN
        public.profiles p ON u.id = p.id
    LEFT JOIN
        public.wallets w ON u.id = w.user_id
    WHERE
        u.id = auth.uid();
END;
$function$;

-- Then, update get_my_profile
DROP FUNCTION IF EXISTS public.get_my_profile();
CREATE OR REPLACE FUNCTION public.get_my_profile()
 RETURNS TABLE(id uuid, full_name text, phone text, dob date, address text, city text, state text, pincode text, updated_at timestamp with time zone, kyc_status text, referral_code text, referrer_id uuid, nominee_name text, nominee_relationship text, nominee_dob date, role text, bank_account_holder_name text, bank_account_number text, bank_ifsc_code text, member_id text, referrer_full_name text, pan_number text, aadhaar_number text, blood_group text, nominee_blood_group text)
 LANGUAGE sql
AS $function$
    SELECT
        u.id,
        COALESCE(p.full_name, u.raw_user_meta_data->>'full_name') as full_name,
        p.phone,
        p.dob,
        p.address,
        p.city,
        p.state,
        p.pincode,
        p.updated_at,
        COALESCE(p.kyc_status, 'Not Submitted') as kyc_status,
        p.referral_code,
        p.referrer_id,
        p.nominee_name,
        p.nominee_relationship,
        p.nominee_dob,
        COALESCE(p.role, 'user') as role,
        p.bank_account_holder_name,
        p.bank_account_number,
        p.bank_ifsc_code,
        p.member_id,
        ref_p.full_name as referrer_full_name,
        p.pan_number,
        p.aadhaar_number,
        p.blood_group,
        p.nominee_blood_group
    FROM
        auth.users u
    LEFT JOIN
        public.profiles p ON u.id = p.id
    LEFT JOIN
        public.profiles ref_p ON p.referrer_id = ref_p.id
    WHERE
        u.id = auth.uid();
$function$;