-- Add a 'reason' column to store why the user is requesting a withdrawal
ALTER TABLE public.investment_withdrawal_requests
ADD COLUMN IF NOT EXISTS reason TEXT;

-- Drop existing functions before recreating them with updated return types
DROP FUNCTION IF EXISTS public.request_investment_withdrawal(uuid, text);
DROP FUNCTION IF EXISTS public.get_my_investment_withdrawal_requests();
DROP FUNCTION IF EXISTS public.get_all_investment_withdrawal_requests(text, text, integer, integer);

-- Recreate the function for creating a request to include the new 'reason' field
CREATE OR REPLACE FUNCTION public.request_investment_withdrawal(p_investment_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Check if there's already a pending request for this investment
    IF EXISTS (
        SELECT 1 FROM public.investment_withdrawal_requests
        WHERE investment_id = p_investment_id AND status = 'Pending'
    ) THEN
        RAISE EXCEPTION 'An investment withdrawal request for this investment is already pending.';
    END IF;

    -- Check if the user owns this investment and it is active
    IF NOT EXISTS (
        SELECT 1 FROM public.user_investments
        WHERE id = p_investment_id AND user_id = auth.uid() AND status = 'Active'
    ) THEN
        RAISE EXCEPTION 'This investment is not eligible for withdrawal.';
    END IF;

    INSERT INTO public.investment_withdrawal_requests (user_id, investment_id, reason)
    VALUES (auth.uid(), p_investment_id, p_reason);
END;
$function$;

-- Recreate the function for users to get their requests to include the 'reason'
CREATE OR REPLACE FUNCTION public.get_my_investment_withdrawal_requests()
 RETURNS TABLE(request_id uuid, plan_name text, investment_amount numeric, requested_at timestamp with time zone, status text, admin_notes text, reason text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        iwr.id,
        ip.name,
        ui.investment_amount,
        iwr.created_at,
        iwr.status,
        iwr.admin_notes,
        iwr.reason
    FROM public.investment_withdrawal_requests iwr
    JOIN public.user_investments ui ON iwr.investment_id = ui.id
    JOIN public.investment_plans ip ON ui.plan_id = ip.id
    WHERE iwr.user_id = auth.uid()
    ORDER BY iwr.created_at DESC;
END;
$function$;

-- Recreate the function for admins to get all requests to include the 'reason'
CREATE OR REPLACE FUNCTION public.get_all_investment_withdrawal_requests(p_status_filter text DEFAULT NULL::text, p_search_text text DEFAULT NULL::text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(request_id uuid, user_id uuid, user_name text, user_email text, plan_name text, investment_amount numeric, investment_start_date date, requested_at timestamp with time zone, status text, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        iwr.id, iwr.user_id, p.full_name, u.email, ip.name, ui.investment_amount, ui.start_date, iwr.created_at, iwr.status, iwr.reason
    FROM public.investment_withdrawal_requests iwr
    JOIN public.user_investments ui ON iwr.investment_id = ui.id
    JOIN public.investment_plans ip ON ui.plan_id = ip.id
    JOIN public.profiles p ON iwr.user_id = p.id
    JOIN auth.users u ON iwr.user_id = u.id
    WHERE (p_status_filter IS NULL OR iwr.status = p_status_filter)
      AND (p_search_text IS NULL OR
           p.full_name ILIKE ('%' || p_search_text || '%') OR
           u.email ILIKE ('%' || p_search_text || '%'))
    ORDER BY CASE iwr.status WHEN 'Pending' THEN 1 ELSE 2 END, iwr.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$function$;