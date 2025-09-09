-- Add p_request_type parameter to get_all_withdrawal_requests
CREATE OR REPLACE FUNCTION public.get_all_withdrawal_requests(p_status_filter text DEFAULT NULL::text, p_search_text text DEFAULT NULL::text, p_request_type text DEFAULT NULL::text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(request_id uuid, user_id uuid, user_name text, user_email text, request_type text, amount numeric, requested_at timestamp with time zone, status text, details jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        wr.id,
        wr.user_id,
        COALESCE(p.full_name, 'Deleted User') AS user_name,
        COALESCE(u.email, 'N/A') AS user_email,
        wr.type,
        wr.amount,
        wr.requested_at,
        wr.status,
        jsonb_build_object(
            'wallet_balance', COALESCE(w.balance, 0.00),
            'bank_account_holder_name', p.bank_account_holder_name,
            'bank_account_number', p.bank_account_number,
            'bank_ifsc_code', p.bank_ifsc_code,
            'reason', wr.details->>'reason',
            'investment_id', wr.details->>'investment_id',
            'plan_name', CASE
                            WHEN wr.type = 'Investment' AND wr.details->>'investment_id' IS NOT NULL THEN
                                (SELECT ip.name FROM public.user_investments ui_inner JOIN public.investment_plans ip ON ui_inner.plan_id = ip.id WHERE ui_inner.id = (wr.details->>'investment_id')::uuid)
                            ELSE NULL
                         END,
            'investment_amount', CASE
                                    WHEN wr.type = 'Investment' AND wr.details->>'investment_id' IS NOT NULL THEN
                                        (SELECT ui_inner.investment_amount FROM public.user_investments ui_inner WHERE ui_inner.id = (wr.details->>'investment_id')::uuid)
                                    ELSE NULL
                                 END
        ) AS details
    FROM public.withdrawal_requests wr
    LEFT JOIN public.profiles p ON wr.user_id = p.id
    LEFT JOIN auth.users u ON wr.user_id = u.id
    LEFT JOIN public.wallets w ON wr.user_id = w.user_id
    WHERE
        (p_status_filter IS NULL OR wr.status = p_status_filter) AND
        (p_request_type IS NULL OR wr.type = p_request_type) AND
        (p_search_text IS NULL OR
         COALESCE(p.full_name, '') ILIKE ('%' || p_search_text || '%') OR
         COALESCE(u.email, '') ILIKE ('%' || p_search_text || '%'))
    ORDER BY
        CASE wr.status WHEN 'Pending' THEN 1 ELSE 2 END,
        wr.requested_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$;

-- Add p_request_type parameter to get_all_withdrawal_requests_count
CREATE OR REPLACE FUNCTION public.get_all_withdrawal_requests_count(p_status_filter text DEFAULT NULL::text, p_search_text text DEFAULT NULL::text, p_request_type text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.withdrawal_requests wr
        LEFT JOIN public.profiles p ON wr.user_id = p.id
        LEFT JOIN auth.users u ON wr.user_id = u.id
        WHERE
            (p_status_filter IS NULL OR wr.status = p_status_filter) AND
            (p_request_type IS NULL OR wr.type = p_request_type) AND
            (p_search_text IS NULL OR
             COALESCE(p.full_name, '') ILIKE ('%' || p_search_text || '%') OR
             COALESCE(u.email, '') ILIKE ('%' || p_search_text || '%'))
    );
END;
$function$;