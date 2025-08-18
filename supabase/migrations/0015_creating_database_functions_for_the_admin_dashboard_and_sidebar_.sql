-- Function for admins to get all tickets
CREATE OR REPLACE FUNCTION public.get_all_support_tickets_admin()
RETURNS TABLE(id uuid, user_id uuid, full_name text, email text, subject text, status text, created_at timestamptz, updated_at timestamptz)
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
        st.id,
        st.user_id,
        p.full_name,
        u.email,
        st.subject,
        st.status,
        st.created_at,
        st.updated_at
    FROM
        public.support_tickets st
    JOIN
        public.profiles p ON st.user_id = p.id
    JOIN
        auth.users u ON st.user_id = u.id
    ORDER BY
        CASE st.status WHEN 'Open' THEN 1 WHEN 'In Progress' THEN 2 ELSE 3 END,
        st.updated_at DESC;
END;
$$;

-- Function for admins to get the count of open tickets for the sidebar badge
CREATE OR REPLACE FUNCTION public.get_open_tickets_count_admin()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Permission denied. Must be an admin.';
    END IF;

    RETURN (SELECT COUNT(*) FROM public.support_tickets WHERE status = 'Open' OR status = 'In Progress');
END;
$$;