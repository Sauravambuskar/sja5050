ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS blood_group TEXT,
ADD COLUMN IF NOT EXISTS nominee_blood_group TEXT;