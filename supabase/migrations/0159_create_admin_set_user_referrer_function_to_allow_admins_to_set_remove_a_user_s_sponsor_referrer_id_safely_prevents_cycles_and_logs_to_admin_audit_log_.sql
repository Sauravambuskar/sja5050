CREATE OR REPLACE FUNCTION public.admin_set_user_referrer(p_user_id uuid, p_referrer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_user_email text;
  cycle_exists boolean;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied. Must be an admin.';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required.';
  END IF;

  IF p_referrer_id IS NOT NULL AND p_referrer_id = p_user_id THEN
    RAISE EXCEPTION 'A user cannot sponsor themselves.';
  END IF;

  -- Ensure user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Target user not found.';
  END IF;

  -- If setting a sponsor, ensure sponsor exists and prevent cycles
  IF p_referrer_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_referrer_id) THEN
      RAISE EXCEPTION 'Sponsor user not found.';
    END IF;

    WITH RECURSIVE ancestors AS (
      SELECT referrer_id
      FROM public.profiles
      WHERE id = p_referrer_id

      UNION ALL

      SELECT p.referrer_id
      FROM public.profiles p
      JOIN ancestors a ON p.id = a.referrer_id
      WHERE a.referrer_id IS NOT NULL
    )
    SELECT EXISTS (SELECT 1 FROM ancestors WHERE referrer_id = p_user_id)
    INTO cycle_exists;

    IF cycle_exists THEN
      RAISE EXCEPTION 'Invalid operation: this change would create a circular referral relationship.';
    END IF;
  END IF;

  UPDATE public.profiles
  SET referrer_id = p_referrer_id,
      updated_at = now()
  WHERE id = p_user_id;

  SELECT email INTO admin_user_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
  VALUES (
    auth.uid(),
    admin_user_email,
    'updated_user_referrer',
    p_user_id,
    jsonb_build_object('referrer_id', p_referrer_id)
  );
END;
$$;