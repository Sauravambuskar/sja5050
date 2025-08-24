-- 1. Create a new table to store direct investment requests
CREATE TABLE public.investment_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.investment_plans(id),
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending, Approved, Rejected
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.investment_requests ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for the new table
CREATE POLICY "Users can view their own investment requests"
ON public.investment_requests FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create investment requests"
ON public.investment_requests FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all investment requests"
ON public.investment_requests FOR ALL
TO authenticated USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. Create a function for users to submit an investment request
CREATE OR REPLACE FUNCTION public.request_investment(p_plan_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.investment_requests (user_id, plan_id, amount)
    VALUES (auth.uid(), p_plan_id, p_amount);
END;
$$;

-- 5. Create a function for admins to process investment requests
CREATE OR REPLACE FUNCTION public.process_investment_request(p_request_id uuid, p_new_status text, p_notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    request record;
    plan record;
    new_maturity_date date;
    admin_user_email TEXT;
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Permission denied. Must be an admin.';
    END IF;

    SELECT email INTO admin_user_email FROM auth.users WHERE id = auth.uid();

    UPDATE public.investment_requests
    SET
        status = p_new_status,
        admin_notes = p_notes,
        reviewed_at = NOW(),
        reviewed_by = auth.uid()
    WHERE id = p_request_id
    RETURNING * INTO request;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Investment request not found.';
    END IF;

    IF p_new_status = 'Approved' THEN
        SELECT * INTO plan FROM public.investment_plans WHERE id = request.plan_id;
        new_maturity_date := CURRENT_DATE + (plan.duration_months * INTERVAL '1 month');

        INSERT INTO public.user_investments (user_id, plan_id, investment_amount, start_date, maturity_date, status)
        VALUES (request.user_id, request.plan_id, request.amount, CURRENT_DATE, new_maturity_date, 'Active');

        INSERT INTO public.transactions (user_id, type, amount, description, status)
        VALUES (request.user_id, 'Investment', request.amount, 'Direct investment in ' || plan.name, 'Completed');

        INSERT INTO public.notifications (user_id, title, description, type, link_to)
        VALUES (request.user_id, 'Investment Approved', 'Your investment of ₹' || request.amount::text || ' in ' || plan.name || ' has been approved and is now active.', 'success', '/investments');
    ELSE -- Rejected
        INSERT INTO public.notifications (user_id, title, description, type, link_to)
        VALUES (request.user_id, 'Investment Rejected', 'Your investment request was rejected. Reason: ' || p_notes, 'error', '/investments');
    END IF;

    INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
    VALUES (auth.uid(), admin_user_email, 'processed_investment_request', request.user_id, jsonb_build_object('request_id', p_request_id, 'new_status', p_new_status, 'notes', p_notes));
END;
$$;

-- 6. Create functions for admins to fetch and count requests
CREATE OR REPLACE FUNCTION public.get_all_investment_requests(p_status_filter text, p_limit integer, p_offset integer)
RETURNS TABLE(request_id uuid, user_name text, user_id uuid, plan_name text, amount numeric, requested_at timestamp with time zone, status text, admin_notes text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ir.id, p.full_name, ir.user_id, ip.name, ir.amount, ir.created_at, ir.status, ir.admin_notes
    FROM public.investment_requests ir
    JOIN public.profiles p ON ir.user_id = p.id
    JOIN public.investment_plans ip ON ir.plan_id = ip.id
    WHERE (p_status_filter IS NULL OR ir.status = p_status_filter)
    ORDER BY ir.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_all_investment_requests_count(p_status_filter text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM public.investment_requests WHERE (p_status_filter IS NULL OR status = p_status_filter));
END;
$$;