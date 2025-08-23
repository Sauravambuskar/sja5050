-- Drop potentially faulty policies if they exist
DROP POLICY IF EXISTS "Allow authenticated select access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;

-- 1. Allow users to view their own proofs and admins to view all
CREATE POLICY "Allow authenticated select access"
ON storage.objects FOR SELECT
TO authenticated
USING (
  (bucket_id = 'deposit_proofs') AND
  (
    (auth.uid() = ((storage.foldername(name))[1])::uuid) OR
    ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  )
);

-- 2. Allow users to upload their own proofs into their user_id folder
CREATE POLICY "Allow authenticated insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  (bucket_id = 'deposit_proofs') AND
  (auth.uid() = ((storage.foldername(name))[1])::uuid)
);

-- 3. Allow users to update their own proofs
CREATE POLICY "Allow authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  (bucket_id = 'deposit_proofs') AND
  (auth.uid() = ((storage.foldername(name))[1])::uuid)
);

-- 4. Allow users to delete their own proofs
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  (bucket_id = 'deposit_proofs') AND
  (auth.uid() = ((storage.foldername(name))[1])::uuid)
);