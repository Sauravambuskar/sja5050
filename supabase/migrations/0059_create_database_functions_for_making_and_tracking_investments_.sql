-- Function to get the current user's wallet balance
CREATE OR REPLACE FUNCTION public.get_my_wallet_balance()
RETURNS numeric
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN (
        SELECT balance
        FROM public.wallets
        WHERE user_id = auth.uid()
    );
END;
$$;

-- Function to handle the investment process
CREATE OR REPLACE FUNCTION public.invest_in_plan(
    plan_id_to_invest uuid,
    investment_amount_to_invest numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_user_id uuid := auth.uid();
    wallet_balance numeric;
    plan_details record;
    new_maturity_date date;
BEGIN
    -- 1. Get the investment plan details
    SELECT * INTO plan_details
    FROM public.investment_plans
    WHERE id = plan_id_to_invest;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Investment plan not found.';
    END IF;

    IF NOT plan_details.is_active THEN
        RAISE EXCEPTION 'This investment plan is currently not active.';
    END IF;

    -- 2. Check user's wallet balance
    SELECT balance INTO wallet_balance
    FROM public.wallets
    WHERE user_id = current_user_id;

    IF wallet_balance IS NULL OR wallet_balance < investment_amount_to_invest THEN
        RAISE EXCEPTION 'Insufficient wallet balance.';
    END IF;

    -- 3. Validate investment amount against plan limits
    IF investment_amount_to_invest < plan_details.min_investment THEN
        RAISE EXCEPTION 'Investment amount is below the minimum for this plan.';
    END IF;

    IF plan_details.max_investment IS NOT NULL AND investment_amount_to_invest > plan_details.max_investment THEN
        RAISE EXCEPTION 'Investment amount is above the maximum for this plan.';
    END IF;

    -- 4. All checks passed, proceed with transaction
    -- Deduct from wallet
    UPDATE public.wallets
    SET balance = balance - investment_amount_to_invest
    WHERE user_id = current_user_id;

    -- Calculate maturity date
    new_maturity_date := CURRENT_DATE + (plan_details.duration_months * INTERVAL '1 month');

    -- Create user investment record
    INSERT INTO public.user_investments (user_id, plan_id, investment_amount, start_date, maturity_date, status)
    VALUES (current_user_id, plan_id_to_invest, investment_amount_to_invest, CURRENT_DATE, new_maturity_date, 'Active');

    -- Log the transaction
    INSERT INTO public.transactions (user_id, type, amount, description, status)
    VALUES (current_user_id, 'Investment', investment_amount_to_invest, 'Investment in ' || plan_details.name, 'Completed');

END;
$$;