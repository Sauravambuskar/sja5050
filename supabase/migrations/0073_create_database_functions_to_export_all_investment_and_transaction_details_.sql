-- Function to export all investment details
CREATE OR REPLACE FUNCTION public.export_all_investments_details()
RETURNS TABLE(
    investment_id uuid,
    user_id uuid,
    user_name text,
    user_email text,
    plan_name text,
    investment_amount numeric,
    start_date date,
    maturity_date date,
    status text,
    created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
    SELECT
        ui.id as investment_id,
        ui.user_id,
        p.full_name as user_name,
        u.email as user_email,
        ip.name as plan_name,
        ui.investment_amount,
        ui.start_date,
        ui.maturity_date,
        ui.status,
        ui.created_at
    FROM
        public.user_investments ui
    LEFT JOIN
        public.profiles p ON ui.user_id = p.id
    LEFT JOIN
        auth.users u ON ui.user_id = u.id
    LEFT JOIN
        public.investment_plans ip ON ui.plan_id = ip.id
    ORDER BY
        ui.created_at DESC;
$$;

-- Function to export all transaction details
CREATE OR REPLACE FUNCTION public.export_all_transactions_details()
RETURNS TABLE(
    transaction_id uuid,
    user_id uuid,
    user_name text,
    user_email text,
    type text,
    amount numeric,
    status text,
    description text,
    created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
    SELECT
        t.id as transaction_id,
        t.user_id,
        p.full_name as user_name,
        u.email as user_email,
        t.type,
        t.amount,
        t.status,
        t.description,
        t.created_at
    FROM
        public.transactions t
    LEFT JOIN
        public.profiles p ON t.user_id = p.id
    LEFT JOIN
        auth.users u ON t.user_id = u.id
    ORDER BY
        t.created_at DESC;
$$;