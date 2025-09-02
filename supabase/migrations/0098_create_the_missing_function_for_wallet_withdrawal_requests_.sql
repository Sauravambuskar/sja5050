-- Create the missing function for wallet withdrawal requests
CREATE OR REPLACE FUNCTION public.request_withdrawal(request_amount numeric)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    wallet_balance numeric;
BEGIN
    -- 1. Check user's wallet balance
    SELECT balance INTO wallet_balance
    FROM public.wallets
    WHERE user_id = current_user_id;

    IF wallet_balance IS NULL OR wallet_balance < request_amount THEN
        RAISE EXCEPTION 'Insufficient wallet balance. You have % but tried to withdraw %.', COALESCE(wallet_balance, 0), request_amount;
    END IF;

    -- 2. Check for minimum withdrawal amount (e.g., > 0)
    IF request_amount <= 0 THEN
        RAISE EXCEPTION 'Withdrawal amount must be a positive number.';
    END IF;

    -- 3. Check for existing pending request
    IF EXISTS (SELECT 1 FROM public.withdrawal_requests WHERE user_id = current_user_id AND status = 'Pending') THEN
        RAISE EXCEPTION 'You already have a pending withdrawal request. Please wait for it to be processed.';
    END IF;

    -- 4. Insert the withdrawal request
    INSERT INTO public.withdrawal_requests (user_id, amount)
    VALUES (current_user_id, request_amount);
END;
$$;