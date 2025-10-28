CREATE OR REPLACE FUNCTION public.approve_investment_request(
  p_request_id uuid,
  p_notes text DEFAULT 'Approved by admin.'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure only admins can perform approvals
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;

  -- Delegate to the existing processor with Approved status
  PERFORM public.process_investment_request(p_request_id, 'Approved', COALESCE(p_notes, 'Approved by admin.'));
END;
$function$;