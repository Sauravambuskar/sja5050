-- Function for users to create a new ticket
CREATE OR REPLACE FUNCTION public.create_support_ticket(p_subject text, p_message text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
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
$$;

-- Function for admins to add a reply
CREATE OR REPLACE FUNCTION public.add_admin_reply_to_ticket(p_ticket_id uuid, p_message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Function for admins to update ticket status
CREATE OR REPLACE FUNCTION public.update_ticket_status_admin(p_ticket_id uuid, p_new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;