DO $$
BEGIN
  -- Allow authenticated users to upload their own signed agreement PDFs to signed_agreements/<auth.uid()>/...
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='signed_agreements_user_insert'
  ) THEN
    CREATE POLICY "signed_agreements_user_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'signed_agreements'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  -- Allow authenticated users to update (overwrite) their own PDFs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='signed_agreements_user_update'
  ) THEN
    CREATE POLICY "signed_agreements_user_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'signed_agreements'
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'signed_agreements'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  -- Allow authenticated users to delete their own PDFs (cleanup)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='signed_agreements_user_delete'
  ) THEN
    CREATE POLICY "signed_agreements_user_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'signed_agreements'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;