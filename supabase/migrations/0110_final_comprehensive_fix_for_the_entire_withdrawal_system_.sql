-- Drop all possible old functions, specifying arguments to avoid ambiguity
DROP FUNCTION IF EXISTS public.get_all_unified_withdrawal_requests(text, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_all_unified_withdrawal_requests_count(text, text);
DROP FUNCTION IF EXISTS public.get_all_investment_withdrawal_requests(text, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_all_investment_withdrawal_requests_count(text);
DROP FUNCTION IF EXISTS public.get_all_investment_withdrawal_requests_count(text, text);
DROP FUNCTION IF EXISTS public.process_investment_withdrawal_request(uuid, text, text);
DROP FUNCTION IF EXISTS public.request_investment_withdrawal(uuid);
DROP FUNCTION IF EXISTS public.request_investment_withdrawal(uuid, numeric, text);
DROP FUNCTION IF EXISTS public.get_my_investment_withdrawal_requests();
DROP FUNCTION IF EXISTS public.get_all_withdrawal_requests(text, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_all_withdrawal_requests_count(text);
DROP FUNCTION IF EXISTS public.get_all_withdrawal_requests_count(text, text);
DROP FUNCTION IF EXISTS public.process_withdrawal_request(uuid, text, text);
DROP FUNCTION IF EXISTS public.request_withdrawal(numeric);
DROP FUNCTION IF EXISTS public.get_my_withdrawal_requests();
DROP FUNCTION IF EXISTS public.get_my_withdrawal_requests(integer, integer);
DROP FUNCTION IF EXISTS public.get_my_withdrawal_requests(text, integer, integer);
DROP FUNCTION IF EXISTS public.get_my_withdrawal_requests_count();
DROP FUNCTION IF EXISTS public.get_my_withdrawal_requests_count(text);
DROP FUNCTION IF EXISTS public.get_admin_dashboard_stats();

-- Drop the old tables to ensure a clean slate
DROP TABLE IF EXISTS public.investment_withdrawal_requests;
DROP TABLE IF EXISTS public.withdrawal_requests;

-- Create the new unified withdrawal_requests table
CREATE TABLE public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('Wallet', 'Investment')),
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Completed')),
    details JSONB,
    admin_notes TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own withdrawal requests" ON public.withdrawal_requests FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all withdrawal requests" ON public.withdrawal_requests FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Function for users to request a WALLET withdrawal
CREATE OR REPLACE FUNCTION public.request_wallet_withdrawal(p_amount numeric)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.withdrawal_requests WHERE user_id = auth.uid() AND status = 'Pending' AND type = 'Wallet') THEN
        RAISE EXCEPTION 'You already have a pending wallet withdrawal request.';
    END IF;
    INSERT INTO public.withdrawal_requests (user_id, amount, type, details) VALUES (auth.uid(), p_amount, 'Wallet', '{}'::jsonb);
END;
$$;

-- Function for users to request an INVESTMENT withdrawal
CREATE OR REPLACE FUNCTION public.request_investment_withdrawal(p_investment_id uuid, p_amount numeric, p_reason text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE investment_principal NUMERIC;
BEGIN
    IF EXISTS (SELECT 1 FROM public.withdrawal_requests WHERE details->>'investment_id' = p_investment_id::text AND status = 'Pending') THEN
        RAISE EXCEPTION 'A withdrawal request for this investment is already pending.';
    END IF;
    SELECT investment_amount INTO investment_principal FROM public.user_investments WHERE id = p_investment_id AND user_id = auth.uid() AND status = 'Active';
    IF NOT FOUND THEN RAISE EXCEPTION 'This investment is not eligible for withdrawal.'; END IF;
    IF p_amount > investment_principal THEN RAISE EXCEPTION 'Withdrawal amount cannot exceed the investment principal.'; END IF;
    INSERT INTO public.withdrawal_requests (user_id, amount, type, details) VALUES (auth.uid(), p_amount, 'Investment', jsonb_build_object('investment_id', p_investment_id, 'reason', p_reason));
END;
$$;

-- UNIFIED function for admins to process ANY withdrawal request
CREATE OR REPLACE FUNCTION public.process_withdrawal_request(p_request_id uuid, p_new_status text, p_notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE request record; admin_user_email TEXT; investment record; remaining_amount NUMERIC;
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Permission denied.'; END IF;
    SELECT email INTO admin_user_email FROM auth.users WHERE id = auth.uid();
    UPDATE public.withdrawal_requests SET status = p_new_status, admin_notes = p_notes, reviewed_at = NOW(), reviewed_by = auth.uid() WHERE id = p_request_id RETURNING * INTO request;
    IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;
    IF p_new_status = 'Approved' THEN
        IF request.type = 'Wallet' THEN
            UPDATE public.wallets SET balance = balance - request.amount WHERE user_id = request.user_id;
            UPDATE public.withdrawal_requests SET status = 'Completed' WHERE id = p_request_id;
        ELSIF request.type = 'Investment' THEN
            SELECT * INTO investment FROM public.user_investments WHERE id = (request.details->>'investment_id')::uuid;
            UPDATE public.wallets SET balance = balance + request.amount WHERE user_id = request.user_id;
            remaining_amount := investment.investment_amount - request.amount;
            IF remaining_amount > 0.009 THEN UPDATE public.user_investments SET investment_amount = remaining_amount WHERE id = investment.id;
            ELSE UPDATE public.user_investments SET status = 'Withdrawn', investment_amount = 0 WHERE id = investment.id; END IF;
        END IF;
    END IF;
END;
$$;

-- UNIFIED function for admins to get all withdrawal requests
CREATE OR REPLACE FUNCTION public.get_all_withdrawal_requests(p_status_filter text, p_search_text text, p_limit integer, p_offset integer)
RETURNS TABLE(request_id uuid, user_id uuid, user_name text, user_email text, request_type text, amount numeric, requested_at timestamptz, status text, details jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
    RETURN QUERY
    SELECT wr.id, wr.user_id, p.full_name, u.email, wr.type, wr.amount, wr.requested_at, wr.status,
           wr.details || jsonb_build_object('wallet_balance', COALESCE(w.balance, 0.00), 'bank_account_holder_name', p.bank_account_holder_name, 'bank_account_number', p.bank_account_number, 'bank_ifsc_code', p.bank_ifsc_code, 'plan_name', ip.name, 'investment_amount', ui.investment_amount)
    FROM public.withdrawal_requests wr
    LEFT JOIN public.profiles p ON wr.user_id = p.id
    LEFT JOIN auth.users u ON wr.user_id = u.id
    LEFT JOIN public.wallets w ON wr.user_id = w.user_id
    LEFT JOIN public.user_investments ui ON wr.type = 'Investment' AND wr.details->>'investment_id' IS NOT NULL AND ui.id = (wr.details->>'investment_id')::uuid
    LEFT JOIN public.investment_plans ip ON ui.plan_id = ip.id
    WHERE (p_status_filter IS NULL OR wr.status = p_status_filter)
      AND (p_search_text IS NULL OR COALESCE(p.full_name, '') ILIKE ('%' || p_search_text || '%') OR COALESCE(u.email, '') ILIKE ('%' || p_search_text || '%'))
    ORDER BY CASE wr.status WHEN 'Pending' THEN 1 ELSE 2 END, wr.requested_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- UNIFIED function to count all withdrawal requests
CREATE OR REPLACE FUNCTION public.get_all_withdrawal_requests_count(p_status_filter text, p_search_text text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM public.withdrawal_requests wr
            LEFT JOIN public.profiles p ON wr.user_id = p.id
            LEFT JOIN auth.users u ON wr.user_id = u.id
            WHERE (p_status_filter IS NULL OR wr.status = p_status_filter)
              AND (p_search_text IS NULL OR COALESCE(p.full_name, '') ILIKE ('%' || p_search_text || '%') OR COALESCE(u.email, '') ILIKE ('%' || p_search_text || '%')));
END;
$$;

-- Function for users to get their own withdrawal history (with pagination and filtering)
CREATE OR REPLACE FUNCTION public.get_my_withdrawal_requests(p_request_type text, p_limit integer, p_offset integer)
RETURNS TABLE(request_id uuid, request_type text, amount numeric, status text, requested_at timestamptz, admin_notes text, details jsonb)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT wr.id, wr.type, wr.amount, wr.status, wr.requested_at, wr.admin_notes,
           wr.details || jsonb_build_object('plan_name', ip.name)
    FROM public.withdrawal_requests wr
    LEFT JOIN public.user_investments ui ON wr.type = 'Investment' AND wr.details->>'investment_id' IS NOT NULL AND ui.id = (wr.details->>'investment_id')::uuid
    LEFT JOIN public.investment_plans ip ON ui.plan_id = ip.id
    WHERE wr.user_id = auth.uid() AND (p_request_type IS NULL OR wr.type = p_request_type)
    ORDER BY wr.requested_at DESC LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Function to count user's withdrawal history
CREATE OR REPLACE FUNCTION public.get_my_withdrawal_requests_count(p_request_type text)
RETURNS bigint LANGUAGE plpgsql AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM public.withdrawal_requests WHERE user_id = auth.uid() AND (p_request_type IS NULL OR type = p_request_type));
END;
$$;

-- Recreate admin dashboard stats function
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE(total_users bigint, aum numeric, pending_kyc bigint, pending_withdrawals_count bigint, pending_withdrawals_value numeric, pending_deposits_count bigint, pending_deposits_value numeric, pending_investments_count bigint, pending_investments_value numeric, monthly_payout_projection numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
    RETURN QUERY SELECT (SELECT COUNT(*) FROM auth.users), (SELECT COALESCE(SUM(investment_amount), 0) FROM public.user_investments WHERE status = 'Active'), (SELECT COUNT(*) FROM public.kyc_documents WHERE status = 'Pending'), (SELECT COUNT(*) FROM public.withdrawal_requests WHERE status = 'Pending'), (SELECT COALESCE(SUM(amount), 0) FROM public.withdrawal_requests WHERE status = 'Pending'), (SELECT COUNT(*) FROM public.deposit_requests WHERE status = 'Pending'), (SELECT COALESCE(SUM(amount), 0) FROM public.deposit_requests WHERE status = 'Pending'), (SELECT COUNT(*) FROM public.investment_requests WHERE status = 'Pending'), (SELECT COALESCE(SUM(amount), 0) FROM public.investment_requests WHERE status = 'Pending'), (SELECT COALESCE(SUM(ui.investment_amount * (ip.annual_rate / 100.0 / 12.0)), 0) FROM public.user_investments ui JOIN public.investment_plans ip ON ui.plan_id = ip.id WHERE ui.status = 'Active');
END;
$$;