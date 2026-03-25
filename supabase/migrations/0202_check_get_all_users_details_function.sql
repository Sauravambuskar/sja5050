SELECT pg_get_functiondef(oid) as function_definition 
FROM pg_proc 
WHERE proname LIKE '%get_all_users%';