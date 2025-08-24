-- Drop dependent functions before altering the table to avoid errors
DROP FUNCTION IF EXISTS public.get_all_investment_requests(text, integer, integer);
DROP FUNCTION IF EXISTS public.process_investment_request(uuid, text, text);
DROP FUNCTION IF EXISTS public.request_investment(uuid, numeric);

-- 1. Add columns for payment proof to the investment_requests table
ALTER TABLE public.investment_requests
ADD COLUMN reference_id TEXT,
ADD COLUMN screenshot_path TEXT;

-- 2. Recreate the function for users to submit an investment request with proof
CREATE OR REPLACE FUNCTION public.request_investment(
    p_plan_id uuid,
    p_amount numeric,
    p_reference_id text,
    p_screenshot_path text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.investment_requests (user_id, plan_id, amount, reference_id, screenshot_path)
    VALUES (auth.uid(), p_plan_id, p_amount, p_reference_id, p_screenshot_path);
END;
$$;

-- 3. Recreate the function for admins to process requests
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

-- 4. Recreate the function for admins to fetch requests, now including payment proof fields
CREATE OR REPLACE FUNCTION public.get_all_investment_requests(p_status_filter text, p_limit integer, p_offset integer)
RETURNS TABLE(request_id uuid, user_name text, user_id uuid, plan_name text, amount numeric, requested_at timestamp with time zone, status text, admin_notes text, reference_id text, screenshot_path text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ir.id, p.full_name, ir.user_id, ip.name, ir.amount, ir.created_at, ir.status, ir.admin_notes, ir.reference_id, ir.screenshot_path
    FROM public.investment_requests ir
    JOIN public.profiles p ON ir.user_id = p.id
    JOIN public.investment_plans ip ON ir.plan_id = ip.id
    WHERE (p_status_filter IS NULL OR ir.status = p_status_filter)
    ORDER BY ir.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;