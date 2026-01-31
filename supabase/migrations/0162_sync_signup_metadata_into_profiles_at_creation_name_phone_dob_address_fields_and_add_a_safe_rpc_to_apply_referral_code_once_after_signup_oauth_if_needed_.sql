-- Extend new-user trigger to store basic profile fields from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_referral_code TEXT;
  referrer_user_id UUID;
  new_member_id TEXT;
  dob_value date;
BEGIN
  -- Generate a unique referral code
  new_referral_code := 'SJA' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  -- Generate a new member ID
  new_member_id := 'SJA-' || lpad(nextval('public.member_id_seq')::text, 5, '0');

  -- Parse DOB safely
  dob_value := NULLIF(NEW.raw_user_meta_data->>'dob', '')::date;

  -- Find referrer if code is provided
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL AND NEW.raw_user_meta_data->>'referral_code' != '' THEN
    SELECT id INTO referrer_user_id
    FROM public.profiles
    WHERE referral_code = NEW.raw_user_meta_data->>'referral_code';
  END IF;

  -- Create profile with basic details
  INSERT INTO public.profiles (
    id,
    full_name,
    phone,
    dob,
    address,
    city,
    state,
    pincode,
    role,
    referral_code,
    referrer_id,
    member_id
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    dob_value,
    NULLIF(NEW.raw_user_meta_data->>'address', ''),
    NULLIF(NEW.raw_user_meta_data->>'city', ''),
    NULLIF(NEW.raw_user_meta_data->>'state', ''),
    NULLIF(NEW.raw_user_meta_data->>'pincode', ''),
    'user',
    new_referral_code,
    referrer_user_id,
    new_member_id
  );

  -- Create a wallet for the new user
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00);

  RETURN NEW;
END;
$function$;

-- Allow users to apply a referral code after OAuth/late entry (one-time only)
CREATE OR REPLACE FUNCTION public.set_my_referrer_by_code(p_referral_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sponsor_id uuid;
  current_referrer uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_referral_code IS NULL OR btrim(p_referral_code) = '' THEN
    RETURN;
  END IF;

  SELECT referrer_id INTO current_referrer
  FROM public.profiles
  WHERE id = auth.uid();

  -- Only allow setting sponsor once
  IF current_referrer IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT id INTO sponsor_id
  FROM public.profiles
  WHERE referral_code = p_referral_code
  LIMIT 1;

  IF sponsor_id IS NULL THEN
    RAISE EXCEPTION 'Invalid referral code.';
  END IF;

  IF sponsor_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot use your own referral code.';
  END IF;

  UPDATE public.profiles
  SET referrer_id = sponsor_id,
      updated_at = now()
  WHERE id = auth.uid()
    AND referrer_id IS NULL;
END;
$function$;