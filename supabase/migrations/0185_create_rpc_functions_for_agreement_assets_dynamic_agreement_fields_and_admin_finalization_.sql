-- Admin RPCs for agreement assets

CREATE OR REPLACE FUNCTION public.get_agreement_assets()
RETURNS TABLE(first_party_name text, stamp_path text, company_signature_path text)
LANGUAGE sql
STABLE
AS $$
  SELECT agreement_first_party_name, agreement_stamp_path, agreement_company_signature_path
  FROM public.system_settings
  WHERE id = 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_agreement_assets() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_agreement_assets(
  p_first_party_name text,
  p_stamp_path text,
  p_company_signature_path text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.system_settings
  SET agreement_first_party_name = p_first_party_name,
      agreement_stamp_path = p_stamp_path,
      agreement_company_signature_path = p_company_signature_path,
      updated_at = NOW()
  WHERE id = 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_agreement_assets(text, text, text) TO authenticated;

-- User RPC to fetch dynamic fields for agreement (current investment)
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
BEGIN
  SELECT COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', u.email)
  INTO v_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = auth.uid();

  RETURN QUERY
  SELECT
    COALESCE(ss.agreement_first_party_name, 'SJA Foundation') as first_party_name,
    v_name as second_party_name,
    ui.start_date as investment_date,
    ui.investment_amount as invested_amount,
    ui.id as user_investment_id
  FROM public.system_settings ss
  CROSS JOIN LATERAL (
    SELECT id, start_date, investment_amount
    FROM public.user_investments
    WHERE user_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT 1
  ) ui
  WHERE ss.id = 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_agreement_dynamic_fields() TO authenticated;

-- Admin RPC to finalize an agreement after company signs
CREATE OR REPLACE FUNCTION public.admin_finalize_investment_agreement(
  p_user_id uuid,
  p_company_signature_path text,
  p_stamp_path text,
  p_pdf_path text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public','auth'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.investment_agreements
  SET company_signature_path = p_company_signature_path,
      stamp_path = p_stamp_path,
      pdf_path = p_pdf_path,
      status = 'finalized',
      admin_signed_at = NOW()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agreement not found for user';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_finalize_investment_agreement(uuid, text, text, text) TO authenticated;