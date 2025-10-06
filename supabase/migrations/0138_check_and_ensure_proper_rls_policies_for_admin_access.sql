-- Ensure the function is callable by authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_users_details TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users_details_count TO authenticated;

-- Check if there are any issues with the admin check
SELECT * FROM public.is_admin();