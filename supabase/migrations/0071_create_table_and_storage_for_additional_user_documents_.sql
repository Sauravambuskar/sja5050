-- 1. Create a new table to store additional documents
CREATE TABLE public.user_additional_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Enable Row Level Security
ALTER TABLE public.user_additional_documents ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
-- Users can view their own documents
CREATE POLICY "Users can view their own additional documents"
ON public.user_additional_documents FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can upload documents for themselves
CREATE POLICY "Users can insert their own additional documents"
ON public.user_additional_documents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.uid() = uploaded_by);

-- Users can delete their own documents
CREATE POLICY "Users can delete their own additional documents"
ON public.user_additional_documents FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can manage all documents
CREATE POLICY "Admins can manage all additional documents"
ON public.user_additional_documents FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. Create a new storage bucket for these documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('additional_documents', 'additional_documents', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Create storage policies
-- Users can manage files in their own folder
CREATE POLICY "Users can manage their own additional documents folder"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'additional_documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admins can access all files
CREATE POLICY "Admins can access all additional documents"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'additional_documents' AND public.is_admin());