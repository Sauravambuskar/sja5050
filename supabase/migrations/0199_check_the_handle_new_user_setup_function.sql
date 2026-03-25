SELECT pg_get_functiondef(oid) as function_definition 
FROM pg_proc 
WHERE proname = 'handle_new_user_setup';