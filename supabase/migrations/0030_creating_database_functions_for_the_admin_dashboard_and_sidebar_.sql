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