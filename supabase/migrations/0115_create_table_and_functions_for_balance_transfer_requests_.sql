-- 1. Create the balance_transfers table
CREATE TABLE public.balance_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    sender_notes TEXT,
    admin_notes TEXT,
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending, Approved, Rejected
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ
);

-- 2. Enable RLS and set up policies
ALTER TABLE public.balance_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own transfer requests"
ON public.balance_transfers FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can view their own transfers"
ON public.balance_transfers FOR SELECT
TO authenticated
USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Admins can manage all transfers"
ON public.balance_transfers FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 3. Function for users to request a transfer
CREATE OR REPLACE FUNCTION public.request_balance_transfer(
    p_recipient_member_id TEXT,
    p_amount NUMERIC,
    p_sender_notes TEXT
)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    sender_wallet_balance NUMERIC;
    recipient_profile RECORD;
BEGIN
    -- Check sender's balance
    SELECT balance INTO sender_wallet_balance FROM public.wallets WHERE user_id = auth.uid();
    IF sender_wallet_balance IS NULL OR sender_wallet_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient wallet balance.';
    END IF;

    -- Find recipient
    SELECT id INTO recipient_profile FROM public.profiles WHERE member_id = p_recipient_member_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recipient with that Member ID not found.';
    END IF;

    -- Prevent sending to self
    IF recipient_profile.id = auth.uid() THEN
        RAISE EXCEPTION 'You cannot transfer funds to your own account.';
    END IF;

    -- Create the request
    INSERT INTO public.balance_transfers (sender_id, recipient_id, amount, sender_notes)
    VALUES (auth.uid(), recipient_profile.id, p_amount, p_sender_notes);
END;
$$;

-- 4. Function for admins to process a transfer
CREATE OR REPLACE FUNCTION public.process_balance_transfer(
    p_request_id UUID,
    p_new_status TEXT,
    p_admin_notes TEXT
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
    request RECORD;
    admin_user_email TEXT;
    sender_name TEXT;
    recipient_name TEXT;
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Permission denied.'; END IF;

    SELECT email INTO admin_user_email FROM auth.users WHERE id = auth.uid();

    UPDATE public.balance_transfers
    SET status = p_new_status, admin_notes = p_admin_notes, reviewed_at = NOW(), reviewed_by = auth.uid()
    WHERE id = p_request_id RETURNING * INTO request;

    IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;

    SELECT full_name INTO sender_name FROM profiles WHERE id = request.sender_id;
    SELECT full_name INTO recipient_name FROM profiles WHERE id = request.recipient_id;

    IF p_new_status = 'Approved' THEN
        -- Perform the transfer
        UPDATE public.wallets SET balance = balance - request.amount WHERE user_id = request.sender_id;
        UPDATE public.wallets SET balance = balance + request.amount WHERE user_id = request.recipient_id;

        -- Log transactions
        INSERT INTO public.transactions (user_id, type, amount, description, status) VALUES (request.sender_id, 'Transfer Out', request.amount, 'Sent to ' || recipient_name, 'Completed');
        INSERT INTO public.transactions (user_id, type, amount, description, status) VALUES (request.recipient_id, 'Transfer In', request.amount, 'Received from ' || sender_name, 'Completed');

        -- Send notifications
        INSERT INTO public.notifications (user_id, title, description, type, link_to) VALUES (request.sender_id, 'Transfer Approved', 'Your transfer of ₹' || request.amount::text || ' to ' || recipient_name || ' was approved.', 'success', '/wallet');
        INSERT INTO public.notifications (user_id, title, description, type, link_to) VALUES (request.recipient_id, 'Funds Received', 'You received ₹' || request.amount::text || ' from ' || sender_name || '.', 'success', '/wallet');
    ELSE -- Rejected
        INSERT INTO public.notifications (user_id, title, description, type, link_to) VALUES (request.sender_id, 'Transfer Rejected', 'Your transfer request was rejected. Reason: ' || p_admin_notes, 'error', '/wallet');
    END IF;

    INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
    VALUES (auth.uid(), admin_user_email, 'processed_balance_transfer', request.sender_id, jsonb_build_object('request_id', p_request_id, 'recipient_id', request.recipient_id, 'new_status', p_new_status, 'notes', p_admin_notes));
END;
$$;

-- 5. Functions to get history
CREATE OR REPLACE FUNCTION public.get_my_balance_transfers()
RETURNS TABLE(id uuid, type text, other_party_name text, amount numeric, status text, requested_at timestamptz, sender_notes text, admin_notes text)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        bt.id,
        CASE WHEN bt.sender_id = auth.uid() THEN 'Sent' ELSE 'Received' END as type,
        CASE WHEN bt.sender_id = auth.uid() THEN (SELECT p.full_name FROM profiles p WHERE p.id = bt.recipient_id) ELSE (SELECT p.full_name FROM profiles p WHERE p.id = bt.sender_id) END as other_party_name,
        bt.amount,
        bt.status,
        bt.requested_at,
        bt.sender_notes,
        bt.admin_notes
    FROM public.balance_transfers bt
    WHERE bt.sender_id = auth.uid() OR bt.recipient_id = auth.uid()
    ORDER BY bt.requested_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_all_balance_transfers(p_status_filter text, p_search_text text, p_limit int, p_offset int)
RETURNS TABLE(request_id uuid, sender_name text, recipient_name text, amount numeric, status text, requested_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
    RETURN QUERY
    SELECT bt.id, s.full_name, r.full_name, bt.amount, bt.status, bt.requested_at
    FROM public.balance_transfers bt
    JOIN public.profiles s ON bt.sender_id = s.id
    JOIN public.profiles r ON bt.recipient_id = r.id
    WHERE (p_status_filter IS NULL OR bt.status = p_status_filter)
    AND (p_search_text IS NULL OR s.full_name ILIKE ('%' || p_search_text || '%') OR r.full_name ILIKE ('%' || p_search_text || '%'))
    ORDER BY bt.requested_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_all_balance_transfers_count(p_status_filter text, p_search_text text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.balance_transfers bt
        JOIN public.profiles s ON bt.sender_id = s.id
        JOIN public.profiles r ON bt.recipient_id = r.id
        WHERE (p_status_filter IS NULL OR bt.status = p_status_filter)
        AND (p_search_text IS NULL OR s.full_name ILIKE ('%' || p_search_text || '%') OR r.full_name ILIKE ('%' || p_search_text || '%'))
    );
END;
$$;