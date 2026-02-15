-- Allow admins to upload/update nominee photos into any user's folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='nominee_photos_admin_insert'
  ) THEN
    CREATE POLICY "nominee_photos_admin_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'nominee_photos' AND public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='nominee_photos_admin_update'
  ) THEN
    CREATE POLICY "nominee_photos_admin_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'nominee_photos' AND public.is_admin())
    WITH CHECK (bucket_id = 'nominee_photos' AND public.is_admin());
  END IF;
END $$;
