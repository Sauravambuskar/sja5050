-- Fix RPC ambiguity + improve exact UUID lookups for admin/user details
DROP FUNCTION IF EXISTS public.get_all_users_details(text, text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_all_users_details(
  search_text text DEFAULT NULL::text,
  kyc_status_filter text DEFAULT NULL::text,
  account_status_filter text DEFAULT NULL::text,
  page_limit integer DEFAULT 20,
  page_offset integer DEFAULT 0,
  sort_by text DEFAULT 'join_date'::text,
  sort_dir text DEFAULT 'desc'::text
)
RETURNS TABLE(
  id uuid,
  full_name text,
  email text,
  join_date timestamp with time zone,
  kyc_status text,
  role text,
  banned_until timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  wallet_balance numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
  SELECT
    u.id,
    p.full_name,
    u.email,
    u.created_at AS join_date,
    p.kyc_status,
    p.role,
    u.banned_until,
    u.last_sign_in_at,
    w.balance as wallet_balance
  FROM
    users u
  LEFT JOIN
    profiles p ON u.id = p.id
  LEFT JOIN
    wallets w ON u.id = w.user_id
  WHERE
    (
      search_text IS NULL
      OR (
        search_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND u.id = search_text::uuid
      )
      OR u.id::text ILIKE search_text || '%'
      OR p.full_name ILIKE '%' || search_text || '%'
      OR u.email ILIKE '%' || search_text || '%'
    )
  AND
    (kyc_status_filter IS NULL OR p.kyc_status = kyc_status_filter)
  AND
    (account_status_filter IS NULL OR
     (account_status_filter = 'Active' AND (u.banned_until IS NULL OR u.banned_until <= NOW())) OR
     (account_status_filter = 'Suspended' AND u.banned_until > NOW())
    )
  ORDER BY
    CASE WHEN sort_by = 'join_date' AND lower(sort_dir) = 'asc' THEN u.created_at END ASC,
    CASE WHEN sort_by = 'join_date' AND lower(sort_dir) = 'desc' THEN u.created_at END DESC,

    CASE WHEN sort_by = 'full_name' AND lower(sort_dir) = 'asc' THEN lower(coalesce(p.full_name, '')) END ASC,
    CASE WHEN sort_by = 'full_name' AND lower(sort_dir) = 'desc' THEN lower(coalesce(p.full_name, '')) END DESC,

    CASE WHEN sort_by = 'email' AND lower(sort_dir) = 'asc' THEN lower(coalesce(u.email, '')) END ASC,
    CASE WHEN sort_by = 'email' AND lower(sort_dir) = 'desc' THEN lower(coalesce(u.email, '')) END DESC,

    u.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
$function$;