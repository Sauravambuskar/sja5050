CREATE OR REPLACE FUNCTION public.get_user_referral_network_flat_for_admin(p_user_id UUID)
RETURNS TABLE(
    user_id uuid,
    full_name text,
    member_id text,
    join_date timestamp with time zone,
    city text,
    sponsor_user_id uuid,
    sponsor_full_name text,
    sponsor_member_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Permission denied.';
    END IF;

    RETURN QUERY
    WITH RECURSIVE referral_chain AS (
        -- Anchor member: direct referrals of the target user
        SELECT
            p.id as user_id,
            p.full_name,
            p.member_id,
            u.created_at as join_date,
            p.city,
            p.referrer_id as sponsor_user_id,
            1 as level
        FROM public.profiles p
        JOIN auth.users u ON p.id = u.id
        WHERE p.referrer_id = p_user_id

        UNION ALL

        -- Recursive member: referrals of the users found in the previous step
        SELECT
            p.id as user_id,
            p.full_name,
            p.member_id,
            u.created_at as join_date,
            p.city,
            p.referrer_id as sponsor_user_id,
            rc.level + 1
        FROM public.profiles p
        JOIN auth.users u ON p.id = u.id
        JOIN referral_chain rc ON p.referrer_id = rc.user_id
    )
    SELECT
        rc.user_id,
        rc.full_name,
        rc.member_id,
        rc.join_date,
        rc.city,
        rc.sponsor_user_id,
        sponsor_profile.full_name as sponsor_full_name,
        sponsor_profile.member_id as sponsor_member_id
    FROM referral_chain rc
    LEFT JOIN public.profiles sponsor_profile ON rc.sponsor_user_id = sponsor_profile.id
    ORDER BY rc.level, rc.join_date DESC;
END;
$$;