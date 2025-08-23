DROP FUNCTION public.get_user_profile_for_admin(uuid);
CREATE OR REPLACE FUNCTION public.get_user_profile_for_admin(user_id_to_fetch uuid)
RETURNS TABLE(
    id uuid,
    full_name text,
    phone text,
    dob date,
    address text,
    city text,
    state text,
    pincode text,
    updated_at timestamp with time zone,
    kyc_status text,
    referral_code text,
    referrer_id uuid,
    nominee_name text,
    nominee_relationship text,
    nominee_dob date,
    role text,
    bank_account_holder_name text,
    bank_account_number text,
    bank_ifsc_code text,
    referrer_full_name text,
    pan_number text,
    aadhaar_number text,
    blood_group text,
    nominee_blood_group text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        p.id,
        p.full_name,
        p.phone,
        p.dob,
        p.address,
        p.city,
        p.state,
        p.pincode,
        p.updated_at,
        p.kyc_status,
        p.referral_code,
        p.referrer_id,
        p.nominee_name,
        p.nominee_relationship,
        p.nominee_dob,
        p.role,
        p.bank_account_holder_name,
        p.bank_account_number,
        p.bank_ifsc_code,
        ref_p.full_name as referrer_full_name,
        p.pan_number,
        p.aadhaar_number,
        p.blood_group,
        p.nominee_blood_group
    FROM
        public.profiles p
    LEFT JOIN
        public.profiles ref_p ON p.referrer_id = ref_p.id
    WHERE
        p.id = user_id_to_fetch;
$$;