-- Function for a user to create a new ticket
CREATE OR REPLACE FUNCTION public.create_support_ticket(p_subject text, p_message text)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
    new_ticket_id UUID;
BEGIN
    -- Insert the new ticket and get its ID
    INSERT INTO public.support_tickets (user_id, subject)
    VALUES (auth.uid(), p_subject)
    RETURNING id INTO new_ticket_id;

    -- Insert the initial message for the new ticket
    INSERT INTO public.support_messages (ticket_id, sender_id, message)
    VALUES (new_ticket_id, auth.uid(), p_message);

    -- Return the ID of the newly created ticket
    RETURN new_ticket_id;
END;
$function$
;

-- Function for an admin to get all tickets
CREATE OR REPLACE FUNCTION public.get_all_support_tickets_admin()
RETURNS TABLE(id uuid, user_id uuid, full_name text, email text, subject text, status text, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$
;

-- Function for an admin to reply to a ticket
CREATE OR REPLACE FUNCTION public.add_admin_reply_to_ticket(p_ticket_id uuid, p_message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    target_user_id UUID;
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Permission denied. Must be an admin.';
    END IF;

    -- Insert the new message
    INSERT INTO public.support_messages (ticket_id, sender_id, message)
    VALUES (p_ticket_id, auth.uid(), p_message);

    -- Update the ticket's timestamp and set status to 'In Progress' if it was 'Open'
    UPDATE public.support_tickets
    SET
        updated_at = NOW(),
        status = CASE WHEN status = 'Open' THEN 'In Progress' ELSE status END
    WHERE id = p_ticket_id
    RETURNING user_id INTO target_user_id;

    -- Send a notification to the user
    INSERT INTO public.notifications (user_id, title, description, type, link_to)
    VALUES (target_user_id, 'New Reply on Your Support Ticket', 'A support agent has replied to your ticket.', 'info', '/support/ticket/' || p_ticket_id);
END;
$function$
;

-- Function for an admin to update a ticket's status
CREATE OR REPLACE FUNCTION public.update_ticket_status_admin(p_ticket_id uuid, p_new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    target_user_id UUID;
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Permission denied. Must be an admin.';
    END IF;

    UPDATE public.support_tickets
    SET status = p_new_status, updated_at = NOW()
    WHERE id = p_ticket_id
    RETURNING user_id INTO target_user_id;

    -- Send a notification to the user when the ticket is closed
    IF p_new_status = 'Closed' THEN
        INSERT INTO public.notifications (user_id, title, description, type, link_to)
        VALUES (target_user_id, 'Your Support Ticket has been Closed', 'If you feel your issue is not resolved, you can create a new ticket.', 'info', '/support');
    END IF;
END;
$function$
;

-- Function for an admin to get a count of open tickets
CREATE OR REPLACE FUNCTION public.get_open_tickets_count_admin()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Permission denied. Must be an admin.';
    END IF;

    RETURN (SELECT COUNT(*) FROM public.support_tickets WHERE status = 'Open' OR status = 'In Progress');
END;
$function$
;