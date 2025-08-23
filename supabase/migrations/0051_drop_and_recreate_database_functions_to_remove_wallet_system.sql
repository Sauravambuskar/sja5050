-- Drop tables related to wallet, deposits, and withdrawals
DROP TABLE IF EXISTS public.wallets CASCADE;
DROP TABLE IF EXISTS public.deposit_requests CASCADE;
DROP TABLE IF EXISTS public.withdrawal_requests CASCADE;

-- Drop functions that are no longer needed
DROP FUNCTION IF EXISTS public.get_my_wallet_balance();
DROP FUNCTION IF EXISTS public.process_deposit_request(uuid, text, text);
DROP FUNCTION IF EXISTS public.submit_deposit_request(numeric, text, text);
DROP FUNCTION IF EXISTS public.get_all_deposit_requests(integer, integer, text, text);
DROP FUNCTION IF EXISTS public.get_all_deposit_requests_count(text, text);
DROP FUNCTION IF EXISTS public.export_all_deposit_requests();
DROP FUNCTION IF EXISTS public.get_my_deposit_requests();
DROP FUNCTION IF EXISTS public.process_withdrawal_request(uuid, text, text);
DROP FUNCTION IF EXISTS public.request_withdrawal(numeric);
DROP FUNCTION IF EXISTS public.get_all_withdrawal_requests(integer, integer, text, text);
DROP FUNCTION IF EXISTS public.get_all_withdrawal_requests_count(text, text);
DROP FUNCTION IF EXISTS public.export_all_withdrawal_requests();
DROP FUNCTION IF EXISTS public.get_my_withdrawal_requests(integer, integer);
DROP FUNCTION IF EXISTS public.get_my_withdrawal_requests_count();
DROP FUNCTION IF EXISTS public.admin_adjust_wallet_balance(uuid, numeric, text);
DROP FUNCTION IF EXISTS public.invest_in_plan(uuid, numeric);
DROP FUNCTION IF EXISTS public.deposit_funds(numeric);

-- Drop functions that will be recreated with a new signature
DROP FUNCTION IF EXISTS public.get_dashboard_stats();
DROP FUNCTION IF EXISTS public.get_admin_dashboard_stats();
DROP FUNCTION IF EXISTS public.get_all_users_details(text, text, text, integer, integer);
DROP FUNCTION IF EXISTS public.export_all_users_details(text, text, text);

-- Recreate functions with updated signatures
CREATE FUNCTION public.get_dashboard_stats()
 RETURNS TABLE("fullName" text, "activeInvestmentsCount" bigint, "totalInvested" numeric, "kycStatus" text, "referralCount" bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    user_profile public.profiles;
BEGIN
    SELECT * INTO user_profile FROM public.profiles WHERE id = auth.uid();
    RETURN QUERY
    SELECT
        COALESCE(user_profile.full_name, auth.email()) as "fullName",
        (SELECT COUNT(*) FROM public.user_investments ui WHERE ui.user_id = auth.uid() AND ui.status = 'Active') as "activeInvestmentsCount",
        (SELECT COALESCE(SUM(ui.investment_amount), 0) FROM public.user_investments ui WHERE ui.user_id = auth.uid() AND ui.status = 'Active') as "totalInvested",
        COALESCE(user_profile.kyc_status, 'Not Submitted') as "kycStatus",
        (SELECT COUNT(*) FROM public.profiles ref WHERE ref.referrer_id = auth.uid()) as "referralCount";
END;
$function$;

CREATE FUNCTION public.get_admin_dashboard_stats()
 RETURNS TABLE(total_users bigint, aum numeric, pending_kyc bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM auth.users),
        (SELECT COALESCE(SUM(investment_amount), 0) FROM public.user_investments WHERE status = 'Active'),
        (SELECT COUNT(*) FROM public.kyc_documents WHERE status = 'Pending');
END;
$function$;

CREATE FUNCTION public.get_all_users_details(search_text text DEFAULT NULL::text, kyc_status_filter text DEFAULT NULL::text, account_status_filter text DEFAULT NULL::text, page_limit integer DEFAULT 20, page_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, full_name text, email text, join_date timestamp with time zone, kyc_status text, role text, banned_until timestamp with time zone, last_sign_in_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
    SELECT
        u.id,
        p.full_name,
        u.email,
        u.created_at AS join_date,
        p.kyc_status,
        p.role,
        u.banned_until,
        u.last_sign_in_at
    FROM
        users u
    LEFT JOIN
        profiles p ON u.id = p.id
    WHERE
        (search_text IS NULL OR u.id::text ILIKE search_text || '%' OR p.full_name ILIKE '%' || search_text || '%' OR u.email ILIKE '%' || search_text || '%')
    AND
        (kyc_status_filter IS NULL OR p.kyc_status = kyc_status_filter)
    AND
        (account_status_filter IS NULL OR
         (account_status_filter = 'Active' AND (u.banned_until IS NULL OR u.banned_until <= NOW())) OR
         (account_status_filter = 'Suspended' AND u.banned_until > NOW())
        )
    ORDER BY
        u.created_at DESC
    LIMIT page_limit
    OFFSET page_offset;
$function$;

CREATE FUNCTION public.export_all_users_details(search_text text DEFAULT NULL::text, kyc_status_filter text DEFAULT NULL::text, account_status_filter text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, full_name text, email text, join_date timestamp with time zone, kyc_status text, role text, banned_until timestamp with time zone, last_sign_in_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
    SELECT
        u.id,
        p.full_name,
        u.email,
        u.created_at AS join_date,
        p.kyc_status,
        p.role,
        u.banned_until,
        u.last_sign_in_at
    FROM
        users u
    LEFT JOIN
        profiles p ON u.id = p.id
    WHERE
        (search_text IS NULL OR u.id::text ILIKE search_text || '%' OR p.full_name ILIKE '%' || search_text || '%' OR u.email ILIKE '%' || search_text || '%')
    AND
        (kyc_status_filter IS NULL OR p.kyc_status = kyc_status_filter)
    AND
        (account_status_filter IS NULL OR
         (account_status_filter = 'Active' AND (u.banned_until IS NULL OR u.banned_until <= NOW())) OR
         (account_status_filter = 'Suspended' AND u.banned_until > NOW())
        )
    ORDER BY
        u.created_at DESC;
$function$;