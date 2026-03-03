ALTER TABLE public.investment_agreements
ADD COLUMN IF NOT EXISTS filled_fields jsonb;