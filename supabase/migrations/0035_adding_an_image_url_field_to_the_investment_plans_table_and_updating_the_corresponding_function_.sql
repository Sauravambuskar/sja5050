-- Add image_url column to investment_plans table
ALTER TABLE public.investment_plans ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Drop old versions of the function to avoid conflicts
DROP FUNCTION IF EXISTS public.upsert_investment_plan(uuid, text, text, numeric, integer, numeric, boolean);
DROP FUNCTION IF EXISTS public.upsert_investment_plan(uuid, text, text, numeric, integer, numeric, numeric, boolean);

-- Recreate the function with the new image_url parameter
CREATE OR REPLACE FUNCTION public.upsert_investment_plan(
    p_id uuid,
    p_name text,
    p_description text,
    p_annual_rate numeric,
    p_duration_months integer,
    p_min_investment numeric,
    p_max_investment numeric,
    p_is_active boolean,
    p_image_url text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.investment_plans (id, name, description, annual_rate, duration_months, min_investment, max_investment, is_active, image_url)
    VALUES (p_id, p_name, p_description, p_annual_rate, p_duration_months, p_min_investment, p_max_investment, p_is_active, p_image_url)
    ON CONFLICT (id) DO UPDATE
    SET
        name = p_name,
        description = p_description,
        annual_rate = p_annual_rate,
        duration_months = p_duration_months,
        min_investment = p_min_investment,
        max_investment = p_max_investment,
        is_active = p_is_active,
        image_url = p_image_url;
END;
$function$