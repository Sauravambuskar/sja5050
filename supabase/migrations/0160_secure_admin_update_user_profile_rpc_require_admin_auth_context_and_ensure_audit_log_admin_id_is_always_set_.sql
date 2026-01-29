CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  p_user_id uuid,
  p_full_name text,
  p_phone text,
  p_dob date,
  p_address text,
  p_city text,
  p_state text,
  p_pincode text,
  p_bank_account_holder_name text,
  p_bank_account_number text,
  p_bank_ifsc_code text,
  p_bank_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_user_email TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied. Must be an admin.';
  END IF;

  SELECT email INTO admin_user_email FROM auth.users WHERE id = auth.uid();

  UPDATE public.profiles SET
    full_name = p_full_name,
    phone = p_phone,
    dob = p_dob,
    address = p_address,
    city = p_city,
    state = p_state,
    pincode = p_pincode,
    bank_account_holder_name = p_bank_account_holder_name,
    bank_account_number = p_bank_account_number,
    bank_ifsc_code = p_bank_ifsc_code,
    bank_name = p_bank_name,
    updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
  VALUES (
    auth.uid(),
    admin_user_email,
    'updated_user_profile',
    p_user_id,
    jsonb_build_object('updated_by', admin_user_email)
  );
END;
$function$;