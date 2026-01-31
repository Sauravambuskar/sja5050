SELECT oidvectortypes(p.proargtypes) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'get_all_users_details'
ORDER BY args;