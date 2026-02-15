-- Dynamic agreement support: assets + final PDF storage + extra fields

-- 1) Extend system settings for agreement assets / template variables
ALTER TABLE public.system_settings
ADD COLUMN IF NOT EXISTS agreement_first_party_name TEXT,
ADD COLUMN IF NOT EXISTS agreement_stamp_path TEXT,
ADD COLUMN IF NOT EXISTS agreement_company_signature_path TEXT;

UPDATE public.system_settings
SET agreement_first_party_name = COALESCE(agreement_first_party_name, 'SJA Foundation')
WHERE id = 1;

-- 2) Storage bucket for agreement assets (stamp + company signature)
INSERT INTO storage.buckets (id, name, public)
VALUES ('agreement_assets', 'agreement_assets', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read assets (needed for signed URLs in client)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='agreement_assets_auth_select'
  ) THEN
    CREATE POLICY "agreement_assets_auth_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'agreement_assets');
  END IF;

  -- Admin can upload/update/delete assets
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='agreement_assets_admin_insert'
  ) THEN
    CREATE POLICY "agreement_assets_admin_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'agreement_assets' AND public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='agreement_assets_admin_update'
  ) THEN
    CREATE POLICY "agreement_assets_admin_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'agreement_assets' AND public.is_admin())
    WITH CHECK (bucket_id = 'agreement_assets' AND public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='agreement_assets_admin_delete'
  ) THEN
    CREATE POLICY "agreement_assets_admin_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'agreement_assets' AND public.is_admin());
  END IF;
END $$;

-- 3) Storage bucket for signed agreement PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('signed_agreements', 'signed_agreements', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  -- User can read their own PDFs in folder auth.uid()/...
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='signed_agreements_user_select'
  ) THEN
    CREATE POLICY "signed_agreements_user_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'signed_agreements'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  -- Admin can manage all PDFs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='signed_agreements_admin_select'
  ) THEN
    CREATE POLICY "signed_agreements_admin_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'signed_agreements' AND public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='signed_agreements_admin_insert'
  ) THEN
    CREATE POLICY "signed_agreements_admin_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'signed_agreements' AND public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='signed_agreements_admin_update'
  ) THEN
    CREATE POLICY "signed_agreements_admin_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'signed_agreements' AND public.is_admin())
    WITH CHECK (bucket_id = 'signed_agreements' AND public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='signed_agreements_admin_delete'
  ) THEN
    CREATE POLICY "signed_agreements_admin_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'signed_agreements' AND public.is_admin());
  END IF;
END $$;

-- 4) Extend investment_agreements to support dynamic fields + finalization
ALTER TABLE public.investment_agreements
ADD COLUMN IF NOT EXISTS user_investment_id UUID REFERENCES public.user_investments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS invested_amount NUMERIC,
ADD COLUMN IF NOT EXISTS investment_date DATE,
ADD COLUMN IF NOT EXISTS first_party_name TEXT,
ADD COLUMN IF NOT EXISTS second_party_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'user_signed',
ADD COLUMN IF NOT EXISTS company_signature_path TEXT,
ADD COLUMN IF NOT EXISTS stamp_path TEXT,
ADD COLUMN IF NOT EXISTS pdf_path TEXT,
ADD COLUMN IF NOT EXISTS admin_signed_at TIMESTAMP WITH TIME ZONE;

-- 5) Ensure a single agreement row per user (so upsert by user_id is safe)
CREATE UNIQUE INDEX IF NOT EXISTS investment_agreements_user_id_key
ON public.investment_agreements(user_id);

-- 6) Allow admins to update investment_agreements (finalization fields)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='investment_agreements'
      AND policyname='Admins can update all investment agreements'
  ) THEN
    CREATE POLICY "Admins can update all investment agreements"
      ON public.investment_agreements
      FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;