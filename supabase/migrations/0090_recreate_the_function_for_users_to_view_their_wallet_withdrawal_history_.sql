CREATE OR REPLACE FUNCTION public.get_my_withdrawal_requests(p_limit integer, p_offset integer)
 RETURNS TABLE(id uuid, amount numeric, status text, requested_at timestamp with time zone, admin_notes text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT r.id, r.amount, r.status, r.requested_at, r.admin_notes
    FROM public.withdrawal_requests r
    WHERE r.user_id = auth.uid()
    ORDER BY r.requested_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$