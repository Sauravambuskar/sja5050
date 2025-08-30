-- 1. Add the new column to the profiles table
ALTER TABLE public.profiles ADD COLUMN bank_name TEXT;

-- 2. Update the function for users to update their own bank details
DROP FUNCTION IF EXISTS public.update_my_bank_details(text, text, text);
CREATE OR REPLACE FUNCTION public.update_my_bank_details(
    p_bank_name text,
    p_bank_account_holder_name text,
    p_bank_account_number text,
    p_bank_ifsc_code text
)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.profiles
    SET
        bank_name = p_bank_name,
        bank_account_holder_name = p_bank_account_holder_name,
        bank_account_number = p_bank_account_number,
        bank_ifsc_code = p_bank_ifsc_code,
        updated_at = now()
    WHERE id = auth.uid();
END;
$function$;

-- 3. Update the get_my_profile function to include the new field
DROP FUNCTION IF EXISTS public.get_my_profile();
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE(id uuid, full_name text, phone text, dob date, address text, city text, state text, pincode text, updated_at timestamp with time zone, kyc_status text, referral_code text, referrer_id uuid, nominee_name text, nominee_relationship text, nominee_dob date, role text, bank_name text, bank_account_holder_name text, bank_account_number text, bank_ifsc_code text, member_id text, referrer_full_name text, pan_number text, aadhaar_number text, blood_group text, nominee_blood_group text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        COALESCE(p.full_name, u.raw_user_meta_data->>'full_name') as full_name,
        p.phone,
        p.dob,
        p.address,
        p.city,
        p.state,
        p.pincode,
        p.updated_at,
        COALESCE(p.kyc_status, 'Not Submitted') as kyc_status,
        p.referral_code,
        p.referrer_id,
        p.nominee_name,
        p.nominee_relationship,
        p.nominee_dob,
        COALESCE(p.role, 'user') as role,
        p.bank_name, -- Added
        p.bank_account_holder_name,
        p.bank_account_number,
        p.bank_ifsc_code,
        p.member_id,
        ref_p.full_name as referrer_full_name,
        p.pan_number,
        p.aadhaar_number,
        p.blood_group,
        p.nominee_blood_group
    FROM
        auth.users u
    LEFT JOIN
        public.profiles p ON u.id = p.id
    LEFT JOIN
        public.profiles ref_p ON p.referrer_id = ref_p.id
    WHERE
        u.id = auth.uid();
END;
$function$;