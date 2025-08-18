DROP FUNCTION IF EXISTS public.get_my_profile() CASCADE;
CREATE OR REPLACE FUNCTION public.get_my_profile()
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
    member_id text,
    referrer_full_name text,
    pan_number text,
    aadhaar_number text,
    blood_group text,
    nominee_blood_group text
)
LANGUAGE sql
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
        p.member_id,
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
        p.id = auth.uid();
$$;