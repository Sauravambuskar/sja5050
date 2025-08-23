CREATE OR REPLACE FUNCTION public.update_my_personal_details(p_full_name text, p_phone text, p_dob date, p_address text, p_city text, p_state text, p_pincode text, p_blood_group text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.profiles
    SET
        full_name = p_full_name,
        phone = p_phone,
        dob = p_dob,
        address = p_address,
        city = p_city,
        state = p_state,
        pincode = p_pincode,
        blood_group = p_blood_group,
        updated_at = now()
    WHERE id = auth.uid();
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_my_nominee_details(p_nominee_name text, p_nominee_relationship text, p_nominee_dob date, p_nominee_blood_group text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.profiles
    SET
        nominee_name = p_nominee_name,
        nominee_relationship = p_nominee_relationship,
        nominee_dob = p_nominee_dob,
        nominee_blood_group = p_nominee_blood_group,
        updated_at = now()
    WHERE id = auth.uid();
END;
$function$;