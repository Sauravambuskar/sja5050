-- Recreate get_admin_dashboard_stats (fixes 404 error)
DROP FUNCTION IF EXISTS public.get_admin_dashboard_stats();
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
 RETURNS TABLE(total_users bigint, aum numeric, pending_kyc bigint, pending_withdrawals_count bigint, pending_deposits_count bigint, pending_deposits_value numeric, pending_investments_count bigint, pending_investments_value numeric, monthly_payout_projection numeric, pending_cancellations_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY SELECT
        (SELECT COUNT(*) FROM auth.users),
        (SELECT COALESCE(SUM(investment_amount), 0) FROM public.user_investments WHERE status = 'Active'),
        (SELECT COUNT(*) FROM public.kyc_documents WHERE status = 'Pending'),
        (SELECT COUNT(*) FROM public.withdrawal_requests WHERE status = 'Pending'),
        (SELECT COUNT(*) FROM public.investment_requests WHERE status = 'Pending' AND screenshot_path IS NOT NULL), -- Changed from deposit_requests
        (SELECT COALESCE(SUM(amount), 0) FROM public.investment_requests WHERE status = 'Pending' AND screenshot_path IS NOT NULL), -- Changed from deposit_requests
        (SELECT COUNT(*) FROM public.investment_requests WHERE status = 'Pending'),
        (SELECT COALESCE(SUM(amount), 0) FROM public.investment_requests WHERE status = 'Pending'),
        (SELECT COALESCE(SUM(ui.investment_amount * (ip.annual_rate / 100.0 / 12.0)), 0) FROM public.user_investments ui JOIN public.investment_plans ip ON ui.plan_id = ip.id WHERE ui.status = 'Active'),
        (SELECT COUNT(*) FROM public.investment_cancellation_requests WHERE status = 'Pending');
END;
$function$;

-- Recreate get_all_deposit_requests and its count function (fixes 404 errors)
-- Note: These functions are being recreated based on the `investment_requests` table as `deposit_requests` was removed.
DROP FUNCTION IF EXISTS public.get_all_deposit_requests(text, text, integer, integer);
CREATE OR REPLACE FUNCTION public.get_all_deposit_requests(p_status_filter text DEFAULT NULL::text, p_search_text text DEFAULT NULL::text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(request_id uuid, user_id uuid, user_name text, user_email text, amount numeric, reference_id text, requested_at timestamp with time zone, status text, screenshot_path text, admin_notes text, wallet_balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        ir.id as request_id,
        ir.user_id,
        p.full_name as user_name,
        u.email as user_email,
        ir.amount,
        ir.reference_id,
        ir.created_at as requested_at,
        ir.status,
        ir.screenshot_path,
        ir.admin_notes,
        w.balance as wallet_balance
    FROM public.investment_requests ir
    JOIN public.profiles p ON ir.user_id = p.id
    JOIN auth.users u ON ir.user_id = u.id
    LEFT JOIN public.wallets w ON ir.user_id = w.user_id
    WHERE ir.screenshot_path IS NOT NULL
      AND (p_status_filter IS NULL OR ir.status = p_status_filter)
      AND (p_search_text IS NULL OR
           p.full_name ILIKE ('%' || p_search_text || '%') OR
           u.email ILIKE ('%' || p_search_text || '%') OR
           ir.reference_id ILIKE ('%' || p_search_text || '%'))
    ORDER BY ir.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$;

DROP FUNCTION IF EXISTS public.get_all_deposit_requests_count(text, text);
CREATE OR REPLACE FUNCTION public.get_all_deposit_requests_count(p_status_filter text DEFAULT NULL::text, p_search_text text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.investment_requests ir
        JOIN public.profiles p ON ir.user_id = p.id
        JOIN auth.users u ON ir.user_id = u.id
        WHERE ir.screenshot_path IS NOT NULL
          AND (p_status_filter IS NULL OR ir.status = p_status_filter)
          AND (p_search_text IS NULL OR
               p.full_name ILIKE ('%' || p_search_text || '%') OR
               u.email ILIKE ('%' || p_search_text || '%') OR
               ir.reference_id ILIKE ('%' || p_search_text || '%'))
    );
END;
$function$;

-- Recreate get_all_kyc_requests (fixes 400 error)
DROP FUNCTION IF EXISTS public.get_all_kyc_requests(text, text, integer, integer);
CREATE OR REPLACE FUNCTION public.get_all_kyc_requests(p_status_filter text DEFAULT NULL::text, p_search_text text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(request_id uuid, user_id uuid, user_name text, user_email text, document_type text, file_path text, submitted_at timestamp with time zone, status text, admin_notes text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        kyc.id as request_id,
        kyc.user_id,
        p.full_name as user_name,
        u.email as user_email,
        kyc.document_type,
        kyc.file_path,
        kyc.submitted_at,
        kyc.status,
        kyc.admin_notes
    FROM
        public.kyc_documents kyc
    JOIN
        public.profiles p ON kyc.user_id = p.id
    JOIN
        auth.users u ON kyc.user_id = u.id
    WHERE
        (p_status_filter IS NULL OR kyc.status = p_status_filter) AND
        (p_search_text IS NULL OR
         p.full_name ILIKE ('%' || p_search_text || '%') OR
         u.email ILIKE ('%' || p_search_text || '%'))
    ORDER BY
        CASE kyc.status WHEN 'Pending' THEN 1 ELSE 2 END,
        kyc.submitted_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$;

-- Recreate get_user_referral_tree_for_admin (fixes 400 error)
DROP FUNCTION IF EXISTS public.get_user_referral_tree_for_admin(uuid);
CREATE OR REPLACE FUNCTION public.get_user_referral_tree_for_admin(p_user_id uuid)
 RETURNS TABLE(id uuid, full_name text, avatar_url text, join_date timestamp with time zone, kyc_status text, has_invested boolean, level integer, parent_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    WITH RECURSIVE referral_tree AS (
        SELECT
            p.id,
            p.full_name,
            (SELECT raw_user_meta_data ->> 'avatar_url' FROM auth.users WHERE id = p.id) as avatar_url,
            u.created_at as join_date,
            p.kyc_status,
            (SELECT COUNT(*) > 0 FROM public.user_investments ui WHERE ui.user_id = p.id) as has_invested,
            1 AS level,
            p.referrer_id as parent_id
        FROM
            public.profiles p
        JOIN
            auth.users u ON p.id = u.id
        WHERE
            p.referrer_id = p_user_id
        UNION ALL
        SELECT
            p.id,
            p.full_name,
            (SELECT raw_user_meta_data ->> 'avatar_url' FROM auth.users WHERE id = p.id) as avatar_url,
            u.created_at as join_date,
            p.kyc_status,
            (SELECT COUNT(*) > 0 FROM public.user_investments ui WHERE ui.user_id = p.id) as has_invested,
            rt.level + 1,
            p.referrer_id as parent_id
        FROM
            public.profiles p
        JOIN
            auth.users u ON p.id = u.id
        JOIN
            referral_tree rt ON p.referrer_id = rt.id
        WHERE
            rt.level < 5
    )
    SELECT rt.id, rt.full_name, rt.avatar_url, rt.join_date, rt.kyc_status, rt.has_invested, rt.level, rt.parent_id FROM referral_tree rt;
END;
$function$;