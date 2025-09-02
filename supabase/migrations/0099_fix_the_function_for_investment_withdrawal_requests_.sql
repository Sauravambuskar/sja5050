-- Fix the function for investment withdrawal requests to correctly handle the amount
CREATE OR REPLACE FUNCTION public.request_investment_withdrawal(p_investment_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    investment_details RECORD;
BEGIN
    -- Check if there's already a pending request for this investment
    IF EXISTS (
        SELECT 1 FROM public.investment_withdrawal_requests
        WHERE investment_id = p_investment_id AND status = 'Pending'
    ) THEN
        RAISE EXCEPTION 'An investment withdrawal request for this investment is already pending.';
    END IF;

    -- Get investment details and check ownership/status
    SELECT * INTO investment_details
    FROM public.user_investments
    WHERE id = p_investment_id AND user_id = auth.uid() AND status = 'Active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'This investment is not eligible for withdrawal.';
    END IF;

    -- Insert the request with the full investment amount
    INSERT INTO public.investment_withdrawal_requests (user_id, investment_id, amount, reason)
    VALUES (auth.uid(), p_investment_id, investment_details.investment_amount, 'Full investment withdrawal request.');
END;
$$;