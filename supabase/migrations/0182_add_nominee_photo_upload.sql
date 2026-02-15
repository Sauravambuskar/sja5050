-- Add nominee photo support
ALTER TABLE public.nominees
ADD COLUMN IF NOT EXISTS photo_path TEXT;

-- Create private storage bucket for nominee photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('nominee_photos', 'nominee_photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for nominee photos
DO $$
BEGIN
  -- Users upload to their own folder
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='nominee_photos_user_insert'
  ) THEN
    CREATE POLICY "nominee_photos_user_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'nominee_photos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  -- Users read their own folder
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='nominee_photos_user_select'
  ) THEN
    CREATE POLICY "nominee_photos_user_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'nominee_photos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  -- Users update their own folder (needed for upsert)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='nominee_photos_user_update'
  ) THEN
    CREATE POLICY "nominee_photos_user_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'nominee_photos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'nominee_photos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  -- Users delete their own folder
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='nominee_photos_user_delete'
  ) THEN
    CREATE POLICY "nominee_photos_user_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'nominee_photos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  -- Admin can read all
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='nominee_photos_admin_select'
  ) THEN
    CREATE POLICY "nominee_photos_admin_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'nominee_photos'
      AND public.is_admin()
    );
  END IF;

  -- Admin can delete all
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='nominee_photos_admin_delete'
  ) THEN
    CREATE POLICY "nominee_photos_admin_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'nominee_photos'
      AND public.is_admin()
    );
  END IF;
END $$;
