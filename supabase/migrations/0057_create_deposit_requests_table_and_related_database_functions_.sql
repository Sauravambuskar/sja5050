-- 1. Create the deposit_requests table
CREATE TABLE IF NOT EXISTS public.deposit_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    reference_id text NOT NULL,
    screenshot_path text,
    status text NOT NULL DEFAULT 'Pending'::text,
    requested_at timestamp with time zone DEFAULT now(),
    admin_notes text,
    reviewed_at timestamp with time zone,
    reviewed_by uuid REFERENCES auth.users(id)
);

-- 2. Enable Row Level Security
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
DROP POLICY IF EXISTS "Users can view their own deposit requests" ON public.deposit_requests;
CREATE POLICY "Users can view their own deposit requests" ON public.deposit_requests
FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create deposit requests" ON public.deposit_requests;
CREATE POLICY "Users can create deposit requests" ON public.deposit_requests
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all deposit requests" ON public.deposit_requests;
CREATE POLICY "Admins can manage all deposit requests" ON public.deposit_requests
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Create the function for users to submit a deposit request
CREATE OR REPLACE FUNCTION public.submit_deposit_request(p_amount numeric, p_reference_id text, p_screenshot_path text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.deposit_requests (user_id, amount, reference_id, screenshot_path)
  VALUES (auth.uid(), p_amount, p_reference_id, p_screenshot_path);
END;
$$;

-- 5. Create the function for admins to process requests
CREATE OR REPLACE FUNCTION public.process_deposit_request(request_id_to_process uuid, new_status text, notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    target_user_id UUID;
    deposit_amount NUMERIC;
    admin_user_email TEXT;
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Permission denied. Must be an admin.';
    END IF;

    -- Get admin email for logging
    SELECT email INTO admin_user_email FROM auth.users WHERE id = auth.uid();

    -- Update the request and get user_id and amount
    UPDATE public.deposit_requests
    SET
        status = new_status,
        admin_notes = notes,
        reviewed_at = NOW(),
        reviewed_by = auth.uid()
    WHERE id = request_id_to_process
    RETURNING user_id, amount INTO target_user_id, deposit_amount;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deposit request not found.';
    END IF;

    -- If approved, update wallet, create transaction, and notify user
    IF new_status = 'Approved' THEN
        -- Credit user's wallet
        UPDATE public.wallets
        SET balance = balance + deposit_amount
        WHERE user_id = target_user_id;

        -- Log the transaction
        INSERT INTO public.transactions (user_id, type, amount, description, status)
        VALUES (target_user_id, 'Deposit', deposit_amount, 'Manual deposit approved by admin.', 'Completed');

        -- Send notification
        INSERT INTO public.notifications (user_id, title, description, type, link_to)
        VALUES (target_user_id, 'Deposit Approved', 'Your deposit of ₹' || deposit_amount::text || ' has been approved and added to your wallet.', 'success', '/wallet');
    ELSE -- If Rejected
        INSERT INTO public.notifications (user_id, title, description, type, link_to)
        VALUES (target_user_id, 'Deposit Rejected', 'Your deposit request was rejected. Reason: ' || notes, 'error', '/wallet');
    END IF;

    -- Log the admin action
    INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
    VALUES (auth.uid(), admin_user_email, 'processed_deposit_request', target_user_id, jsonb_build_object('request_id', request_id_to_process, 'new_status', new_status, 'notes', notes));
END;
$$;

-- 6. Create the function to export all deposit requests
CREATE OR REPLACE FUNCTION public.export_all_deposit_requests()
RETURNS TABLE(
    request_id uuid,
    user_name text,
    user_email text,
    amount numeric,
    reference_id text,
    requested_at timestamp with time zone,
    status text,
    admin_notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Permission denied. Must be an admin.';
    END IF;

    RETURN QUERY
    SELECT
        dr.id,
        p.full_name,
        u.email,
        dr.amount,
        dr.reference_id,
        dr.requested_at,
        dr.status,
        dr.admin_notes
    FROM public.deposit_requests dr
    LEFT JOIN public.profiles p ON dr.user_id = p.id
    LEFT JOIN auth.users u ON dr.user_id = u.id
    ORDER BY dr.requested_at DESC;
END;
$$;