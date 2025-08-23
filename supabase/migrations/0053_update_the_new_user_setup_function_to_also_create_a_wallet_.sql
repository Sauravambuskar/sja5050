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
BEGIN
    -- Generate a unique referral code
    new_referral_code := 'SJA' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    
    -- Generate a new member ID
    new_member_id := 'SJA-' || lpad(nextval('public.member_id_seq')::text, 5, '0');

    -- Find referrer if code is provided
    IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL AND NEW.raw_user_meta_data->>'referral_code' != '' THEN
        SELECT id INTO referrer_user_id
        FROM public.profiles
        WHERE referral_code = NEW.raw_user_meta_data->>'referral_code';
    END IF;

    -- Create profile with new member ID
    INSERT INTO public.profiles (id, full_name, role, referral_code, referrer_id, member_id)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
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
$function$