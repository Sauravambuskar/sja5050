-- Policy to allow authenticated users to upload files to the 'deposit_proofs' bucket
CREATE POLICY "Allow authenticated users to upload deposit proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'deposit_proofs');

-- Policy to allow authenticated users to view files from the 'deposit_proofs' bucket
CREATE POLICY "Allow authenticated users to view deposit proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'deposit_proofs');