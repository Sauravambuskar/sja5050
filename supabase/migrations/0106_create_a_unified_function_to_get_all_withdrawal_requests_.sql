CREATE OR REPLACE FUNCTION public.get_all_unified_withdrawal_requests(
    p_status_filter text DEFAULT NULL::text,
    p_search_text text DEFAULT NULL::text,
    p_limit integer DEFAULT 10,
    p_offset integer DEFAULT 0
)
RETURNS TABLE(
    request_id uuid,
    user_id uuid,
    user_name text,
    user_email text,
    request_type text,
    amount numeric,
    requested_at timestamp with time zone,
    status text,
    details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    WITH all_requests AS (
        -- Wallet Withdrawals
        SELECT
            wr.id as request_id,
            wr.user_id,
            p.full_name as user_name,
            u.email as user_email,
            'Wallet' as request_type,
            wr.amount,
            wr.requested_at,
            wr.status,
            jsonb_build_object(
                'wallet_balance', COALESCE(w.balance, 0.00),
                'bank_account_holder_name', p.bank_account_holder_name,
                'bank_account_number', p.bank_account_number,
                'bank_ifsc_code', p.bank_ifsc_code
            ) as details
        FROM public.withdrawal_requests wr
        LEFT JOIN public.profiles p ON wr.user_id = p.id
        LEFT JOIN auth.users u ON wr.user_id = u.id
        LEFT JOIN public.wallets w ON wr.user_id = w.user_id

        UNION ALL

        -- Investment Withdrawals
        SELECT
            iwr.id as request_id,
            iwr.user_id,
            p.full_name as user_name,
            u.email as user_email,
            'Investment' as request_type,
            iwr.amount as amount,
            iwr.created_at as requested_at,
            iwr.status,
            jsonb_build_object(
                'plan_name', COALESCE(ip.name, 'Deleted Plan'),
                'investment_amount', COALESCE(ui.investment_amount, 0),
                'reason', iwr.reason
            ) as details
        FROM public.investment_withdrawal_requests iwr
        LEFT JOIN public.user_investments ui ON iwr.investment_id = ui.id
        LEFT JOIN public.investment_plans ip ON ui.plan_id = ip.id
        LEFT JOIN public.profiles p ON iwr.user_id = p.id
        LEFT JOIN auth.users u ON iwr.user_id = u.id
    )
    SELECT *
    FROM all_requests ar
    WHERE
        (p_status_filter IS NULL OR ar.status = p_status_filter) AND
        (p_search_text IS NULL OR
         COALESCE(ar.user_name, '') ILIKE ('%' || p_search_text || '%') OR
         COALESCE(ar.user_email, '') ILIKE ('%' || p_search_text || '%'))
    ORDER BY
        CASE ar.status WHEN 'Pending' THEN 1 ELSE 2 END,
        ar.requested_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;