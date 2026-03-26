SELECT pg_get_functiondef(oid) as function_definition 
FROM pg_proc 
WHERE proname = 'admin_update_agreement_assets';