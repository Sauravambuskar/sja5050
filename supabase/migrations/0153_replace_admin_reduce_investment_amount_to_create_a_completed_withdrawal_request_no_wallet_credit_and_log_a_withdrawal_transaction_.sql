CREATE OR REPLACE FUNCTION public.admin_reduce_investment_amount(p_investment_id uuid, p_reduction_amount numeric, p_notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    investment_record public.user_investments;
    admin_user_email TEXT;
    plan_name_text TEXT;
    remaining_amount NUMERIC;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Permission denied. Must be an admin.';
    END IF;

    SELECT email INTO admin_user_email FROM auth.users WHERE id = auth.uid();

    -- Lock investment
    SELECT * INTO investment_record FROM public.user_investments WHERE id = p_investment_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Investment not found.';
    END IF;

    IF investment_record.status != 'Active' THEN
        RAISE EXCEPTION 'Can only reduce amount on active investments.';
    END IF;

    IF p_reduction_amount <= 0 THEN
        RAISE EXCEPTION 'Reduction amount must be positive.';
    END IF;

    IF p_reduction_amount > investment_record.investment_amount THEN
        RAISE EXCEPTION 'Reduction amount cannot be greater than the current investment amount.';
    END IF;

    SELECT name INTO plan_name_text FROM public.investment_plans WHERE id = investment_record.plan_id;

    -- Reduce principal
    UPDATE public.user_investments
    SET investment_amount = investment_amount - p_reduction_amount
    WHERE id = p_investment_id;

    SELECT investment_amount INTO remaining_amount FROM public.user_investments WHERE id = p_investment_id;

    -- If fully withdrawn, mark as Withdrawn
    IF remaining_amount <= 0.009 THEN
        UPDATE public.user_investments
        SET status = 'Withdrawn', investment_amount = 0
        WHERE id = p_investment_id;
    END IF;

    -- Create a Completed withdrawal request (so it shows in history)
    INSERT INTO public.withdrawal_requests (
        user_id, amount, type, status, details, admin_notes, requested_at, reviewed_at, reviewed_by
    )
    VALUES (
        investment_record.user_id,
        p_reduction_amount,
        'Investment',
        'Completed',
        jsonb_build_object(
            'reason', p_notes,
            'investment_id', p_investment_id::text
        ),
        p_notes,
        NOW(),
        NOW(),
        auth.uid()
    );

    -- Log a Withdrawal transaction
    INSERT INTO public.transactions (user_id, type, amount, description, status)
    VALUES (
        investment_record.user_id,
        'Withdrawal',
        p_reduction_amount,
        'Admin reduced investment principal in ' || plan_name_text || '. Notes: ' || COALESCE(p_notes, ''),
        'Completed'
    );

    -- Notify user
    INSERT INTO public.notifications (user_id, title, description, type, link_to)
    VALUES (
        investment_record.user_id,
        'Investment Withdrawal Processed',
        '₹' || p_reduction_amount::text || ' withdrawn from your investment in ' || plan_name_text || '.',
        'warning',
        '/withdrawals'
    );

    -- Audit log
    INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
    VALUES (
        auth.uid(),
        admin_user_email,
        'reduced_investment_amount',
        investment_record.user_id,
        jsonb_build_object('investment_id', p_investment_id, 'reduction_amount', p_reduction_amount, 'notes', p_notes)
    );
END;
$function$;