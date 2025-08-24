CREATE OR REPLACE FUNCTION public.get_birthdays_this_month()
RETURNS TABLE(id uuid, full_name text, dob date)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.full_name, p.dob
    FROM public.profiles p
    WHERE p.dob IS NOT NULL AND EXTRACT(MONTH FROM p.dob) = EXTRACT(MONTH FROM CURRENT_DATE)
    ORDER BY EXTRACT(DAY FROM p.dob);
END;
$$;