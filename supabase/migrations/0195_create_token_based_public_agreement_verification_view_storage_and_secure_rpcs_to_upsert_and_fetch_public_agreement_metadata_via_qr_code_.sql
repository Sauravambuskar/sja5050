-- Public agreement verification views (token-based, safe subset)
CREATE TABLE IF NOT EXISTS public.agreement_public_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agreement_id UUID NOT NULL REFERENCES public.investment_agreements(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agreement_id)
);

ALTER TABLE public.agreement_public_views ENABLE ROW LEVEL SECURITY;

-- No direct SELECT/INSERT/UPDATE policies; access is via SECURITY DEFINER RPCs.

CREATE OR REPLACE FUNCTION public.upsert_agreement_public_view(
  p_agreement_id UUID,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_token TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_token TEXT;
BEGIN
  SELECT user_id INTO v_owner
  FROM public.investment_agreements
  WHERE id = p_agreement_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Agreement not found';
  END IF;

  IF NOT (public.is_admin() OR v_owner = auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  v_token := COALESCE(p_token, gen_random_uuid()::text);

  INSERT INTO public.agreement_public_views (agreement_id, token, payload)
  VALUES (p_agreement_id, v_token, COALESCE(p_payload, '{}'::jsonb))
  ON CONFLICT (agreement_id)
  DO UPDATE SET
    payload = EXCLUDED.payload,
    updated_at = now()
  RETURNING public.agreement_public_views.token INTO v_token;

  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_agreement_public_view(
  p_token TEXT
)
RETURNS TABLE (
  token TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT apv.token, apv.payload, apv.created_at, apv.updated_at
  FROM public.agreement_public_views apv
  WHERE apv.token = p_token
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_agreement_public_view(UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_agreement_public_view(TEXT) TO anon, authenticated;