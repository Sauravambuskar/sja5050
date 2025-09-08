-- 1. Create the user_notes table
CREATE TABLE public.user_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_email TEXT, -- Denormalized for easier display
    note TEXT NOT NULL,
    is_visible_to_user BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable RLS and create policies
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all user notes"
ON public.user_notes FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Users can view their visible notes"
ON public.user_notes FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND is_visible_to_user = TRUE);

-- 3. Function for admins to add a note
CREATE OR REPLACE FUNCTION public.add_user_note(p_user_id uuid, p_note text, p_is_visible boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
    admin_user_email TEXT;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Permission denied.';
    END IF;

    SELECT email INTO admin_user_email FROM auth.users WHERE id = auth.uid();

    INSERT INTO public.user_notes (user_id, admin_id, admin_email, note, is_visible_to_user)
    VALUES (p_user_id, auth.uid(), admin_user_email, p_note, p_is_visible);

    IF p_is_visible THEN
        INSERT INTO public.notifications (user_id, title, description, type, link_to)
        VALUES (p_user_id, 'New Note from Admin', 'An admin has added a new note to your account.', 'info', '/notes');
    END IF;

    INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
    VALUES (auth.uid(), admin_user_email, 'added_user_note', p_user_id, jsonb_build_object('note', p_note, 'is_visible', p_is_visible));
END;
$$;

-- 4. Function for admins to get all notes for a user
CREATE OR REPLACE FUNCTION public.get_user_notes_for_admin(p_user_id uuid)
RETURNS TABLE(id uuid, note text, admin_email text, is_visible_to_user boolean, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Permission denied.';
    END IF;

    RETURN QUERY
    SELECT un.id, un.note, un.admin_email, un.is_visible_to_user, un.created_at
    FROM public.user_notes un
    WHERE un.user_id = p_user_id
    ORDER BY un.created_at DESC;
END;
$$;

-- 5. Function for users to get their visible notes
CREATE OR REPLACE FUNCTION public.get_my_visible_notes()
RETURNS TABLE(id uuid, note text, admin_email text, created_at timestamptz)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT un.id, un.note, un.admin_email, un.created_at
    FROM public.user_notes un
    WHERE un.user_id = auth.uid() AND un.is_visible_to_user = TRUE
    ORDER BY un.created_at DESC;
END;
$$;