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