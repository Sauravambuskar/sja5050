CREATE OR REPLACE FUNCTION public.process_kyc_request(request_id_to_process uuid, new_status text, admin_notes_text text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    target_user_id UUID;
    all_docs_approved BOOLEAN;
    notification_title TEXT;
    notification_description TEXT;
    notification_type TEXT;
    admin_user_email TEXT;
BEGIN
    -- Get admin email for logging
    SELECT email INTO admin_user_email FROM auth.users WHERE id = auth.uid();

    -- Update the specific KYC document
    UPDATE public.kyc_documents
    SET status = new_status, reviewed_at = NOW(), admin_notes = admin_notes_text
    WHERE id = request_id_to_process
    RETURNING user_id INTO target_user_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'KYC request not found.'; END IF;

    -- Create a notification for the specific document status change
    IF new_status = 'Approved' THEN
        notification_title := 'KYC Document Approved';
        notification_description := 'Your KYC document has been successfully verified.';
        notification_type := 'success';
    ELSE
        notification_title := 'KYC Document Rejected';
        notification_description := 'Your KYC document was rejected. Notes: ' || admin_notes_text;
        notification_type := 'error';
    END IF;
    INSERT INTO public.notifications (user_id, title, description, type, link_to)
    VALUES (target_user_id, notification_title, notification_description, notification_type, '/profile?tab=kyc');

    -- Check if all of the user's documents are now approved
    SELECT bool_and(d.status = 'Approved')
    INTO all_docs_approved
    FROM public.kyc_documents d
    WHERE d.user_id = target_user_id;

    -- Update the main profile KYC status if necessary
    IF all_docs_approved THEN
        UPDATE public.profiles SET kyc_status = 'Approved' WHERE id = target_user_id;
        INSERT INTO public.notifications (user_id, title, description, type, link_to)
        VALUES (target_user_id, 'KYC Verification Complete', 'Congratulations! Your overall KYC status is now Approved.', 'success', '/profile');
    ELSIF new_status = 'Rejected' THEN
        UPDATE public.profiles SET kyc_status = 'Rejected' WHERE id = target_user_id;
    END IF;

    -- Log the action
    INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
    VALUES (auth.uid(), admin_user_email, 'processed_kyc_request', target_user_id, jsonb_build_object('new_status', new_status, 'notes', admin_notes_text));
END;
$function$
;