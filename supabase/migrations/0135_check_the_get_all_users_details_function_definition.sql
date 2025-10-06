SELECT 
    proname,
    prosrc,
    proargnames,
    proargtypes
FROM pg_proc 
WHERE proname = 'get_all_users_details';