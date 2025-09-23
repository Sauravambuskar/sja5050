-- Create system_assets storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('system_assets', 'system_assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for system_assets bucket
CREATE POLICY "Public access to system assets" ON storage.objects
FOR SELECT USING (bucket_id = 'system_assets');

CREATE POLICY "Authenticated users can upload system assets" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'system_assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their own system assets" ON storage.objects
FOR UPDATE USING (bucket_id = 'system_assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete their own system assets" ON storage.objects
FOR DELETE USING (bucket_id = 'system_assets' AND auth.role() = 'authenticated');