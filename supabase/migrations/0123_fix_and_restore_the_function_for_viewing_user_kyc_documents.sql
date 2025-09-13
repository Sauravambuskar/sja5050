-- First, remove the old version of the function to avoid conflicts
DROP FUNCTION IF EXISTS public.get_user_kyc_documents_for_admin(uuid);

-- Now, recreate the function with the correct structure, including the user's email
CREATE OR REPLACE FUNCTION public.get_user_kyc_documents_for_admin(user_id_to_fetch uuid)
 RETURNS TABLE(request_id uuid, user_id uuid, user_name text, user_email text, document_type text, file_path text, submitted_at timestamp with time zone, status text, admin_notes text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        kyc.id as request_id,
        kyc.user_id,
        p.full_name as user_name,
        u.email as user_email,
        kyc.document_type,
        kyc.file_path,
        kyc.submitted_at,
        kyc.status,
        kyc.admin_notes
    FROM
        public.kyc_documents kyc
    JOIN
        public.profiles p ON kyc.user_id = p.id
    JOIN
        auth.users u ON kyc.user_id = u.id
    WHERE
        kyc.user_id = user_id_to_fetch
    ORDER BY
        kyc.submitted_at DESC;
END;
$function$