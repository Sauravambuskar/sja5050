CREATE OR REPLACE FUNCTION get_admin_kyc_overview(
  p_search_text TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  aadhaar_number TEXT,
  pan_number TEXT,
  status TEXT,
  "Aadhaar Front" TEXT,
  "Aadhaar Back" TEXT,
  "PAN" TEXT,
  "Selfie" TEXT,
  "Voter ID" TEXT,
  "Driving License" TEXT,
  "Bank Statement" TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_docs AS (
    SELECT
      p.id as user_id,
      p.full_name,
      u.email,
      p.aadhaar_number,
      p.pan_number,
      p.kyc_status as status,
      jsonb_object_agg(kd.document_type, kd.file_path) as documents
    FROM
      public.profiles p
    JOIN
      auth.users u ON p.id = u.id
    LEFT JOIN
      public.kyc_documents kd ON p.id = kd.user_id
    WHERE
      (p_search_text IS NULL OR p.full_name ILIKE ('%' || p_search_text || '%') OR u.email ILIKE ('%' || p_search_text || '%'))
      AND (p_status_filter IS NULL OR p.kyc_status = p_status_filter)
    GROUP BY
      p.id, u.email
  )
  SELECT
    ud.user_id,
    ud.full_name,
    ud.email,
    ud.aadhaar_number,
    ud.pan_number,
    ud.status,
    ud.documents->>'Aadhaar Front' as "Aadhaar Front",
    ud.documents->>'Aadhaar Back' as "Aadhaar Back",
    ud.documents->>'PAN' as "PAN",
    ud.documents->>'Selfie' as "Selfie",
    ud.documents->>'Voter ID' as "Voter ID",
    ud.documents->>'Driving License' as "Driving License",
    ud.documents->>'Bank Statement' as "Bank Statement"
  FROM user_docs ud
  ORDER BY ud.full_name
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION get_admin_kyc_overview_count(
  p_search_text TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT p.id)
    FROM public.profiles p
    JOIN auth.users u ON p.id = u.id
    WHERE
      (p_search_text IS NULL OR p.full_name ILIKE ('%' || p_search_text || '%') OR u.email ILIKE ('%' || p_search_text || '%'))
      AND (p_status_filter IS NULL OR p.kyc_status = p_status_filter)
  );
END;
$$;

CREATE OR REPLACE FUNCTION admin_process_user_kyc(
  p_user_id UUID,
  p_new_status TEXT,
  p_admin_notes TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_user_email TEXT;
    notification_title TEXT;
    notification_description TEXT;
    notification_type TEXT;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Permission denied.';
    END IF;

    SELECT email INTO admin_user_email FROM auth.users WHERE id = auth.uid();

    -- Update all of the user's documents and profile status
    UPDATE public.kyc_documents
    SET status = p_new_status, admin_notes = p_admin_notes, reviewed_at = NOW()
    WHERE user_id = p_user_id AND status = 'Pending';

    UPDATE public.profiles
    SET kyc_status = p_new_status
    WHERE id = p_user_id;

    -- Create a notification for the user
    IF p_new_status = 'Approved' THEN
        notification_title := 'KYC Verification Complete';
        notification_description := 'Congratulations! Your KYC has been approved.';
        notification_type := 'success';
    ELSE
        notification_title := 'KYC Rejected';
        notification_description := 'Your KYC submission was rejected. Notes: ' || p_admin_notes;
        notification_type := 'error';
    END IF;

    INSERT INTO public.notifications (user_id, title, description, type, link_to)
    VALUES (p_user_id, notification_title, notification_description, notification_type, '/profile?tab=kyc');

    -- Log the action
    INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
    VALUES (auth.uid(), admin_user_email, 'processed_user_kyc', p_user_id, jsonb_build_object('new_status', p_new_status, 'notes', p_admin_notes));
END;
$$;