-- Create the storage bucket for deposit proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('deposit_proofs', 'deposit_proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload files to their own folder
CREATE POLICY "allow_user_uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deposit_proofs' AND
  owner = auth.uid() AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to view their own uploaded files
CREATE POLICY "allow_user_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deposit_proofs' AND
  owner = auth.uid()
);

-- Policy: Allow admins to view all files for verification
CREATE POLICY "allow_admin_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deposit_proofs' AND
  public.is_admin()
);