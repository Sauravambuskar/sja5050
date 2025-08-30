-- 1. Create the new nominees table with RLS
CREATE TABLE public.nominees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    dob DATE,
    blood_group TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE public.nominees IS 'Stores multiple nominee details for each user.';

-- 2. Enable RLS on the new table
ALTER TABLE public.nominees ENABLE ROW LEVEL SECURITY;

-- 3. Define RLS policies for the nominees table
CREATE POLICY "Users can view their own nominees" ON public.nominees FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own nominees" ON public.nominees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own nominees" ON public.nominees FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own nominees" ON public.nominees FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all nominees" ON public.nominees FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Remove old single-nominee columns from the profiles table
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS nominee_name,
DROP COLUMN IF EXISTS nominee_relationship,
DROP COLUMN IF EXISTS nominee_dob,
DROP COLUMN IF EXISTS nominee_blood_group;

-- 5. Drop the now-obsolete function for updating a single nominee
DROP FUNCTION IF EXISTS public.update_my_nominee_details(text, text, date, text);
DROP FUNCTION IF EXISTS public.update_my_nominee_details(text, text, date);

-- 6. Update related functions to remove references to old nominee columns
DROP FUNCTION IF EXISTS public.get_my_profile();
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE(id uuid, full_name text, phone text, dob date, address text, city text, state text, pincode text, updated_at timestamp with time zone, kyc_status text, referral_code text, referrer_id uuid, role text, bank_name text, bank_account_holder_name text, bank_account_number text, bank_ifsc_code text, member_id text, referrer_full_name text, pan_number text, aadhaar_number text, blood_group text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'auth' AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, COALESCE(p.full_name, u.raw_user_meta_data->>'full_name'), p.phone, p.dob, p.address, p.city, p.state, p.pincode, p.updated_at, COALESCE(p.kyc_status, 'Not Submitted'), p.referral_code, p.referrer_id, COALESCE(p.role, 'user'), p.bank_name, p.bank_account_holder_name, p.bank_account_number, p.bank_ifsc_code, p.member_id, ref_p.full_name, p.pan_number, p.aadhaar_number, p.blood_group
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    LEFT JOIN public.profiles ref_p ON p.referrer_id = ref_p.id
    WHERE u.id = auth.uid();
END;
$$;

DROP FUNCTION IF EXISTS public.get_user_profile_for_admin(uuid);
CREATE OR REPLACE FUNCTION public.get_user_profile_for_admin(user_id_to_fetch uuid)
RETURNS TABLE(id uuid, full_name text, phone text, dob date, address text, city text, state text, pincode text, updated_at timestamp with time zone, kyc_status text, referral_code text, referrer_id uuid, role text, bank_account_holder_name text, bank_account_number text, bank_ifsc_code text, referrer_full_name text, pan_number text, aadhaar_number text, blood_group text, bank_name text)
LANGUAGE sql SECURITY DEFINER AS $$
    SELECT p.id, p.full_name, p.phone, p.dob, p.address, p.city, p.state, p.pincode, p.updated_at, p.kyc_status, p.referral_code, p.referrer_id, p.role, p.bank_account_holder_name, p.bank_account_number, p.bank_ifsc_code, ref_p.full_name, p.pan_number, p.aadhaar_number, p.blood_group, p.bank_name
    FROM public.profiles p
    LEFT JOIN public.profiles ref_p ON p.referrer_id = ref_p.id
    WHERE p.id = user_id_to_fetch;
$$;

DROP FUNCTION IF EXISTS public.admin_update_user_profile(uuid, text, text, date, text, text, text, text, text, text, text, text, text, date);
CREATE OR REPLACE FUNCTION public.admin_update_user_profile(p_user_id uuid, p_full_name text, p_phone text, p_dob date, p_address text, p_city text, p_state text, p_pincode text, p_bank_account_holder_name text, p_bank_account_number text, p_bank_ifsc_code text, p_bank_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
    admin_user_email TEXT;
BEGIN
    SELECT email INTO admin_user_email FROM auth.users WHERE id = auth.uid();
    UPDATE public.profiles SET
        full_name = p_full_name, phone = p_phone, dob = p_dob, address = p_address, city = p_city, state = p_state, pincode = p_pincode,
        bank_account_holder_name = p_bank_account_holder_name, bank_account_number = p_bank_account_number, bank_ifsc_code = p_bank_ifsc_code, bank_name = p_bank_name,
        updated_at = now()
    WHERE id = p_user_id;
    INSERT INTO public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
    VALUES (auth.uid(), admin_user_email, 'updated_user_profile', p_user_id, jsonb_build_object('updated_by', admin_user_email));
END;
$$;

DROP FUNCTION IF EXISTS public.export_all_users_details(text, text, text);
CREATE OR REPLACE FUNCTION public.export_all_users_details(search_text text DEFAULT NULL::text, kyc_status_filter text DEFAULT NULL::text, account_status_filter text DEFAULT NULL::text)
RETURNS TABLE(member_id text, user_id uuid, full_name text, email text, phone text, role text, join_date timestamp with time zone, last_sign_in_at timestamp with time zone, account_status text, kyc_status text, wallet_balance numeric, dob date, address text, city text, state text, pincode text, pan_number text, aadhaar_number text, blood_group text, bank_account_holder_name text, bank_account_number text, bank_ifsc_code text, referral_code text, referrer_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public', 'auth' AS $$
    SELECT p.member_id, u.id, p.full_name, u.email, p.phone, p.role, u.created_at, u.last_sign_in_at,
           CASE WHEN u.banned_until IS NULL OR u.banned_until <= NOW() THEN 'Active' ELSE 'Suspended' END,
           p.kyc_status, w.balance, p.dob, p.address, p.city, p.state, p.pincode, p.pan_number, p.aadhaar_number, p.blood_group,
           p.bank_account_holder_name, p.bank_account_number, p.bank_ifsc_code, p.referral_code, p.referrer_id
    FROM users u
    LEFT JOIN profiles p ON u.id = p.id
    LEFT JOIN wallets w ON u.id = w.user_id
    WHERE (search_text IS NULL OR u.id::text ILIKE search_text || '%' OR p.full_name ILIKE '%' || search_text || '%' OR u.email ILIKE '%' || search_text || '%')
    AND (kyc_status_filter IS NULL OR p.kyc_status = kyc_status_filter)
    AND (account_status_filter IS NULL OR
         (account_status_filter = 'Active' AND (u.banned_until IS NULL OR u.banned_until <= NOW())) OR
         (account_status_filter = 'Suspended' AND u.banned_until > NOW()))
    ORDER BY u.created_at DESC;
$$;