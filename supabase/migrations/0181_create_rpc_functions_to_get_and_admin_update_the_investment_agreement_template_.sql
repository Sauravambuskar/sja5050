-- Admin-specific RPCs for managing the investment agreement template

CREATE OR REPLACE FUNCTION public.get_investment_agreement_template()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT investment_agreement_text
  FROM public.system_settings
  WHERE id = 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_investment_agreement_template() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_investment_agreement_template(p_text TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.system_settings
  SET investment_agreement_text = p_text,
      updated_at = NOW()
  WHERE id = 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_investment_agreement_template(TEXT) TO authenticated;