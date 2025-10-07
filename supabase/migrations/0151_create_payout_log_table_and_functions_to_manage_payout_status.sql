-- Create the table to log monthly payout statuses
CREATE TABLE public.payout_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID NOT NULL REFERENCES public.user_investments(id) ON DELETE CASCADE,
    payout_month DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending', -- Can be 'Pending', 'Paid', 'Rejected'
    paid_amount NUMERIC,
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_mode TEXT,
    remarks TEXT,
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_investment_month UNIQUE (investment_id, payout_month)
);

-- Enable Row Level Security
ALTER TABLE public.payout_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can manage payout logs
CREATE POLICY "Admins can manage payout logs"
ON public.payout_log
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Function for admins to record or update a payout transaction
CREATE OR REPLACE FUNCTION public.record_payout(
    p_investment_id UUID,
    p_payout_month DATE,
    p_status TEXT,
    p_paid_amount NUMERIC,
    p_payment_mode TEXT,
    p_remarks TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Permission denied. Must be an admin.';
    END IF;

    INSERT INTO public.payout_log (
        investment_id,
        payout_month,
        status,
        paid_amount,
        payment_date,
        payment_mode,
        remarks,
        processed_by,
        processed_at
    )
    VALUES (
        p_investment_id,
        p_payout_month,
        p_status,
        p_paid_amount,
        CASE WHEN p_status = 'Paid' THEN NOW() ELSE NULL END,
        p_payment_mode,
        p_remarks,
        auth.uid(),
        NOW()
    )
    ON CONFLICT (investment_id, payout_month)
    DO UPDATE SET
        status = EXCLUDED.status,
        paid_amount = EXCLUDED.paid_amount,
        payment_date = EXCLUDED.payment_date,
        payment_mode = EXCLUDED.payment_mode,
        remarks = EXCLUDED.remarks,
        processed_by = EXCLUDED.processed_by,
        processed_at = EXCLUDED.processed_at;
END;
$$;

-- Update the get_admin_ledger function to include the new payout status fields
DROP FUNCTION IF EXISTS public.get_admin_ledger(date);
CREATE OR REPLACE FUNCTION public.get_admin_ledger(p_month_start date)
RETURNS TABLE(
    user_id uuid,
    user_name text,
    investment_id uuid,
    plan_name text,
    investment_amount numeric,
    start_date date,
    maturity_date date,
    monthly_payout numeric,
    daily_payout numeric,
    days_in_period integer,
    accrued_in_period numeric,
    bank_account_holder_name text,
    bank_account_number text,
    bank_ifsc_code text,
    payout_status text,
    payout_remarks text,
    paid_amount numeric,
    payment_date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    end_of_month date;
    calculation_end_date date;
BEGIN
    end_of_month := (p_month_start + interval '1 month' - interval '1 day')::date;

    IF date_trunc('month', p_month_start) > date_trunc('month', CURRENT_DATE) THEN
        calculation_end_date := p_month_start - interval '1 day';
    ELSIF date_trunc('month', p_month_start) = date_trunc('month', CURRENT_DATE) THEN
        calculation_end_date := CURRENT_DATE;
    ELSE
        calculation_end_date := end_of_month;
    END IF;

    RETURN QUERY
    SELECT
        p.id as user_id,
        p.full_name as user_name,
        ui.id as investment_id,
        ip.name as plan_name,
        ui.investment_amount,
        ui.start_date,
        ui.maturity_date,
        (ui.investment_amount * (ip.annual_rate / 100.0 / 12.0))::numeric(10, 2) as monthly_payout,
        (ui.investment_amount * (ip.annual_rate / 100.0 / 365.0))::numeric(10, 2) as daily_payout,
        GREATEST(0, (LEAST(calculation_end_date, ui.maturity_date, end_of_month) - GREATEST(p_month_start, ui.start_date) + 1))::integer as days_in_period,
        (
            (ui.investment_amount * (ip.annual_rate / 100.0 / 365.0)) *
            GREATEST(0, (LEAST(calculation_end_date, ui.maturity_date, end_of_month) - GREATEST(p_month_start, ui.start_date) + 1))
        )::numeric(10, 2) as accrued_in_period,
        p.bank_account_holder_name,
        p.bank_account_number,
        p.bank_ifsc_code,
        COALESCE(pl.status, 'Pending') as payout_status,
        pl.remarks as payout_remarks,
        pl.paid_amount,
        pl.payment_date
    FROM
        public.user_investments ui
    JOIN
        public.profiles p ON ui.user_id = p.id
    JOIN
        public.investment_plans ip ON ui.plan_id = ip.id
    LEFT JOIN
        public.payout_log pl ON ui.id = pl.investment_id AND pl.payout_month = date_trunc('month', p_month_start)::date
    WHERE
        ui.status = 'Active' AND
        ui.start_date <= end_of_month AND
        ui.maturity_date >= p_month_start;
END;
$$;