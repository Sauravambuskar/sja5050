CREATE OR REPLACE FUNCTION public.record_payout(
  p_investment_id uuid,
  p_payout_month date,
  p_status text,
  p_paid_amount numeric,
  p_payment_mode text,
  p_remarks text,
  p_platform_fee numeric DEFAULT NULL,
  p_edit_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inv record;
  user_name text;
  link_month text;
  net_amount numeric;
  reason_text text;
BEGIN
  IF NOT is_admin() THEN
      RAISE EXCEPTION 'Permission denied. Must be an admin.';
  END IF;

  -- Upsert payout log (include platform fee and edit reason)
  INSERT INTO public.payout_log (
      investment_id,
      payout_month,
      status,
      paid_amount,
      payment_date,
      payment_mode,
      remarks,
      processed_by,
      processed_at,
      platform_fee,
      edit_reason
  )
  VALUES (
      p_investment_id,
      p_payout_month,
      p_status,
      p_paid_amount,
      CASE WHEN p_status = 'Paid' THEN NOW() ELSE NULL END,
      p_payment_mode,
      p_remarks,
      auth.uid(),
      NOW(),
      p_platform_fee,
      p_edit_reason
  )
  ON CONFLICT (investment_id, payout_month)
  DO UPDATE SET
      status = EXCLUDED.status,
      paid_amount = EXCLUDED.paid_amount,
      payment_date = EXCLUDED.payment_date,
      payment_mode = EXCLUDED.payment_mode,
      remarks = EXCLUDED.remarks,
      processed_by = EXCLUDED.processed_by,
      processed_at = EXCLUDED.processed_at,
      platform_fee = EXCLUDED.platform_fee,
      edit_reason = EXCLUDED.edit_reason;

  -- Load investment + plan for descriptions
  SELECT ui.*, ip.name INTO inv
  FROM public.user_investments ui
  JOIN public.investment_plans ip ON ip.id = ui.plan_id
  WHERE ui.id = p_investment_id;

  link_month := to_char(date_trunc('month', p_payout_month)::date, 'YYYY-MM');
  reason_text := coalesce(nullif(p_edit_reason, ''), nullif(p_remarks, ''), NULL);

  IF p_status = 'Paid' THEN
    -- Create notifications with receipt links
    INSERT INTO public.notifications (user_id, title, description, type, link_to)
    VALUES (
      inv.user_id,
      'Payout Paid',
      'Your monthly payout for ' || coalesce(inv.name, 'Investment') || ' (' || to_char(p_payout_month, 'Mon YYYY') || ') has been paid. Amount: ₹' || coalesce(p_paid_amount, 0)::text,
      'success',
      '/receipts/payout/' || p_investment_id::text || '/' || link_month
    );

    INSERT INTO public.notifications (user_id, title, description, type, link_to)
    VALUES (
      auth.uid(),
      'Payout Receipt Created',
      'Receipt generated for ' || coalesce((SELECT full_name FROM public.profiles WHERE id = inv.user_id), 'User') || ' - ' || coalesce(inv.name, 'Investment') || ' (' || to_char(p_payout_month, 'Mon YYYY') || ').',
      'info',
      '/admin/receipts/payout/' || p_investment_id::text || '/' || link_month
    );

    -- Record the transaction (Completed)
    net_amount := coalesce(p_paid_amount, 0) - coalesce(p_platform_fee, 0);
    INSERT INTO public.transactions (user_id, type, amount, description, status)
    VALUES (
      inv.user_id,
      'Investment Payout',
      net_amount,
      'Monthly payout for ' || coalesce(inv.name, 'Investment') || ' (' || to_char(p_payout_month, 'Mon YYYY') || ')' ||
        CASE WHEN p_platform_fee IS NOT NULL THEN ' | Platform fee: ₹' || p_platform_fee::text ELSE '' END,
      'Completed'
    );

  ELSIF p_status = 'Rejected' THEN
    -- Notify user of rejection
    INSERT INTO public.notifications (user_id, title, description, type, link_to)
    VALUES (
      inv.user_id,
      'Payout Rejected',
      'Your monthly payout for ' || coalesce(inv.name, 'Investment') || ' (' || to_char(p_payout_month, 'Mon YYYY') || ') was rejected.' ||
        CASE WHEN reason_text IS NOT NULL THEN ' Reason: ' || reason_text ELSE '' END,
      'error',
      '/payment-history'
    );

    -- Record the transaction (Rejected)
    INSERT INTO public.transactions (user_id, type, amount, description, status)
    VALUES (
      inv.user_id,
      'Investment Payout',
      0,
      'Payout rejected for ' || coalesce(inv.name, 'Investment') || ' (' || to_char(p_payout_month, 'Mon YYYY') || ')' ||
        CASE WHEN reason_text IS NOT NULL THEN ' | Reason: ' || reason_text ELSE '' END,
      'Rejected'
    );
  END IF;
END;
$function$;