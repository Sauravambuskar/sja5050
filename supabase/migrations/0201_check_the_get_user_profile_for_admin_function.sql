SELECT pg_get_functiondef(oid) as function_definition 
FROM pg_proc 
WHERE proname = 'get_user_profile_for_admin';