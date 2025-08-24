CREATE OR REPLACE FUNCTION public.request_investment_withdrawal(p_investment_id uuid)
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

    INSERT INTO public.investment_withdrawal_requests (user_id, investment_id)
    VALUES (auth.uid(), p_investment_id);
END;
$function$