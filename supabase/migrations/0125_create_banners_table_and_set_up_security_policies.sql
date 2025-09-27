-- Create banners table
CREATE TABLE public.banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  link_to TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. Admins can manage all banners
CREATE POLICY "Admins can manage banners"
ON public.banners
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- 2. Authenticated users can view active banners
CREATE POLICY "Users can view active banners"
ON public.banners
FOR SELECT
TO authenticated
USING (is_active = true);

-- Create a dedicated storage bucket for banner images
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- Create security policies for the new storage bucket
CREATE POLICY "Admins can manage banner images"
ON storage.objects FOR ALL
USING ( bucket_id = 'banners' AND is_admin() )
WITH CHECK ( bucket_id = 'banners' AND is_admin() );

CREATE POLICY "Public can view banner images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'banners' );