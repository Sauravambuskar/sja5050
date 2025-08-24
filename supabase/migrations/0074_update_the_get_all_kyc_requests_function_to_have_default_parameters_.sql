CREATE OR REPLACE FUNCTION public.get_all_kyc_requests(p_status_filter text DEFAULT NULL, p_search_text text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
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
        (p_status_filter IS NULL OR kyc.status = p_status_filter) AND
        (p_search_text IS NULL OR
         p.full_name ILIKE ('%' || p_search_text || '%') OR
         u.email ILIKE ('%' || p_search_text || '%'))
    ORDER BY
        CASE kyc.status WHEN 'Pending' THEN 1 ELSE 2 END,
        kyc.submitted_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$;