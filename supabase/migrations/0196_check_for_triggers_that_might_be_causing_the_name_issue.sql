SELECT trigger_name, event_manipulation, event_object_table, action_statement 
FROM information_schema.triggers 
WHERE event_object_table IN ('profiles', 'auth.users') 
ORDER BY trigger_name;