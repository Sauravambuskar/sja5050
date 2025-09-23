-- Add login_page_logo_url column to system_settings table
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS login_page_logo_url TEXT;

-- Update the updated_at timestamp
UPDATE public.system_settings 
SET updated_at = NOW() 
WHERE id = 1;