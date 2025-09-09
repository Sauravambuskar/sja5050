-- Create a function for admins to securely adjust wallet balances
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet_balance(p_user_id uuid, p_amount numeric, p_description text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    admin_user_email TEXT;
BEGIN
    -- 1. Check for admin privileges
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Permission denied. Must be an admin.';
    END IF;

    -- 2. Get admin email for logging
    SELECT email INTO admin_user_email FROM auth.users WHERE id = auth.uid();

    -- 3. Update wallet balance
    UPDATE public.wallets
    SET balance = balance + p_amount
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User wallet not found.';
    END IF;

    -- 4. Log the transaction for the user
    INSERT INTO public.transactions (user_id, type, amount, description, status)
    VALUES (p_user_id, 'Wallet Adjustment', p_amount, 'Admin adjustment: ' || p_description, 'Completed');

    -- 5. Log the action in the admin audit log
    INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
    VALUES (auth.uid(), admin_user_email, 'adjusted_wallet_balance', p_user_id, jsonb_build_object('amount', p_amount, 'description', p_description));

    RETURN 'Wallet balance adjusted successfully.';
END;
$$;