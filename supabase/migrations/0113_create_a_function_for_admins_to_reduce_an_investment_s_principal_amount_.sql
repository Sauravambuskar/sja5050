CREATE OR REPLACE FUNCTION public.admin_reduce_investment_amount(
    p_investment_id uuid,
    p_reduction_amount numeric,
    p_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    investment_record public.user_investments;
    admin_user_email TEXT;
    plan_name_text TEXT;
BEGIN
    -- 1. Check for admin privileges
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Permission denied. Must be an admin.';
    END IF;

    -- 2. Get admin email for logging
    SELECT email INTO admin_user_email FROM auth.users WHERE id = auth.uid();

    -- 3. Retrieve the investment record and lock it for update
    SELECT * INTO investment_record FROM public.user_investments WHERE id = p_investment_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Investment not found.';
    END IF;

    IF investment_record.status != 'Active' THEN
        RAISE EXCEPTION 'Can only reduce amount on active investments.';
    END IF;

    -- 4. Validate the reduction amount
    IF p_reduction_amount <= 0 THEN
        RAISE EXCEPTION 'Reduction amount must be positive.';
    END IF;

    IF p_reduction_amount > investment_record.investment_amount THEN
        RAISE EXCEPTION 'Reduction amount cannot be greater than the current investment amount.';
    END IF;

    -- 5. Get plan name for logging
    SELECT name INTO plan_name_text FROM public.investment_plans WHERE id = investment_record.plan_id;

    -- 6. Update the investment amount
    UPDATE public.user_investments
    SET investment_amount = investment_amount - p_reduction_amount
    WHERE id = p_investment_id;

    -- 7. Credit the reduced amount back to the user's wallet
    UPDATE public.wallets
    SET balance = balance + p_reduction_amount
    WHERE user_id = investment_record.user_id;

    -- 8. Log the transaction for the user
    INSERT INTO public.transactions (user_id, type, amount, description, status)
    VALUES (investment_record.user_id, 'Investment Adjustment', p_reduction_amount, 'Investment principal reduced by admin. Notes: ' || p_notes, 'Completed');

    -- 9. Send a notification to the user
    INSERT INTO public.notifications (user_id, title, description, type, link_to)
    VALUES (investment_record.user_id, 'Investment Amount Reduced', 'An admin has reduced your investment in ' || plan_name_text || ' by ₹' || p_reduction_amount::text || '. The amount has been credited to your wallet. Reason: ' || p_notes, 'warning', '/investments');

    -- 10. Log the action in the admin audit log
    INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
    VALUES (auth.uid(), admin_user_email, 'reduced_investment_amount', investment_record.user_id, jsonb_build_object('investment_id', p_investment_id, 'reduction_amount', p_reduction_amount, 'notes', p_notes));

END;
$$;