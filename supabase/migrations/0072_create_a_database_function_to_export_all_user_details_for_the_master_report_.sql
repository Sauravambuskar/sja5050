-- Drop the existing function if it exists, to be replaced with a more comprehensive version.
DROP FUNCTION IF EXISTS public.export_all_users_details(text, text, text);

-- Recreate the function to include all profile, auth, and wallet details for a complete export.
CREATE OR REPLACE FUNCTION public.export_all_users_details(
    search_text text DEFAULT NULL::text,
    kyc_status_filter text DEFAULT NULL::text,
    account_status_filter text DEFAULT NULL::text
)
RETURNS TABLE(
    member_id text,
    user_id uuid,
    full_name text,
    email text,
    phone text,
    role text,
    join_date timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    account_status text,
    kyc_status text,
    wallet_balance numeric,
    dob date,
    address text,
    city text,
    state text,
    pincode text,
    pan_number text,
    aadhaar_number text,
    blood_group text,
    bank_account_holder_name text,
    bank_account_number text,
    bank_ifsc_code text,
    nominee_name text,
    nominee_relationship text,
    nominee_dob date,
    nominee_blood_group text,
    referral_code text,
    referrer_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
    SELECT
        p.member_id,
        u.id as user_id,
        p.full_name,
        u.email,
        p.phone,
        p.role,
        u.created_at AS join_date,
        u.last_sign_in_at,
        CASE
            WHEN u.banned_until IS NULL OR u.banned_until <= NOW() THEN 'Active'
            ELSE 'Suspended'
        END AS account_status,
        p.kyc_status,
        w.balance as wallet_balance,
        p.dob,
        p.address,
        p.city,
        p.state,
        p.pincode,
        p.pan_number,
        p.aadhaar_number,
        p.blood_group,
        p.bank_account_holder_name,
        p.bank_account_number,
        p.bank_ifsc_code,
        p.nominee_name,
        p.nominee_relationship,
        p.nominee_dob,
        p.nominee_blood_group,
        p.referral_code,
        p.referrer_id
    FROM
        users u
    LEFT JOIN
        profiles p ON u.id = p.id
    LEFT JOIN
        wallets w ON u.id = w.user_id
    WHERE
        (search_text IS NULL OR u.id::text ILIKE search_text || '%' OR p.full_name ILIKE '%' || search_text || '%' OR u.email ILIKE '%' || search_text || '%')
    AND
        (kyc_status_filter IS NULL OR p.kyc_status = kyc_status_filter)
    AND
        (account_status_filter IS NULL OR
         (account_status_filter = 'Active' AND (u.banned_until IS NULL OR u.banned_until <= NOW())) OR
         (account_status_filter = 'Suspended' AND u.banned_until > NOW())
        )
    ORDER BY
        u.created_at DESC;
$$;