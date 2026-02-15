-- Ensure dynamic fields RPC returns even if no investments exist
CREATE OR REPLACE FUNCTION public.get_my_agreement_dynamic_fields()
RETURNS TABLE(
  first_party_name text,
  second_party_name text,
  investment_date date,
  invested_amount numeric,
  user_investment_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public','auth'
AS $$
DECLARE
  v_name text;
  v_ui_id uuid;
  v_start_date date;
  v_amount numeric;
BEGIN
  SELECT COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', u.email)
  INTO v_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = auth.uid();

  SELECT id, start_date, investment_amount
  INTO v_ui_id, v_start_date, v_amount
  FROM public.user_investments
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN QUERY
  SELECT
    COALESCE(ss.agreement_first_party_name, 'SJA Foundation') as first_party_name,
    v_name as second_party_name,
    COALESCE(v_start_date, CURRENT_DATE) as investment_date,
    COALESCE(v_amount, 0) as invested_amount,
    v_ui_id as user_investment_id
  FROM public.system_settings ss
  WHERE ss.id = 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_agreement_dynamic_fields() TO authenticated;