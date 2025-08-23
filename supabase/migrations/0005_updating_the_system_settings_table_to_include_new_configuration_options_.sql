-- Add columns for maintenance mode
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS maintenance_mode_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS maintenance_message TEXT;

-- Add column for company bank details (using JSONB for flexibility)
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS company_bank_details JSONB;

-- Add columns for UI customization
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS auth_layout_image_url_1 TEXT;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS auth_layout_image_url_2 TEXT;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS splash_screen_url TEXT;