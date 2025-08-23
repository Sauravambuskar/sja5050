DROP FUNCTION IF EXISTS public.get_all_withdrawal_requests() CASCADE;
CREATE OR REPLACE FUNCTION public.get_all_withdrawal_requests()
 RETURNS TABLE(
    request_id uuid, 
    user_name text, 
    user_id uuid, 
    user_email text, 
    amount numeric, 
    requested_at timestamp with time zone, 
    status text, 
    bank_account_holder_name text, 
    bank_account_number text, 
    bank_ifsc_code text, 
    wallet_balance numeric
)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        wr.id AS request_id,
        p.full_name AS user_name,
        p.id as user_id,
        u.email as user_email,
        wr.amount,
        wr.requested_at,
        wr.status,
        p.bank_account_holder_name,
        p.bank_account_number,
        p.bank_ifsc_code,
        w.balance as wallet_balance
    FROM
        public.withdrawal_requests wr
    JOIN
        public.profiles p ON wr.user_id = p.id
    JOIN
        auth.users u ON wr.user_id = u.id
    LEFT JOIN
        public.wallets w ON wr.user_id = w.user_id
    ORDER BY
        CASE wr.status WHEN 'Pending' THEN 1 ELSE 2 END,
        wr.requested_at DESC;
END;
$function$