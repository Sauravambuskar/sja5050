-- Add PDF-template based agreement settings
ALTER TABLE public.system_settings
ADD COLUMN IF NOT EXISTS agreement_pdf_template_url text,
ADD COLUMN IF NOT EXISTS agreement_pdf_field_map jsonb;

UPDATE public.system_settings
SET agreement_pdf_template_url = COALESCE(agreement_pdf_template_url, '/agreement-templates/PGS_2.pdf'),
    agreement_pdf_field_map = COALESCE(agreement_pdf_field_map, '{}'::jsonb)
WHERE id = 1;

-- Track generated PDF metadata per agreement
ALTER TABLE public.investment_agreements
ADD COLUMN IF NOT EXISTS user_pdf_path text,
ADD COLUMN IF NOT EXISTS reference_number text,
ADD COLUMN IF NOT EXISTS document_hash text;