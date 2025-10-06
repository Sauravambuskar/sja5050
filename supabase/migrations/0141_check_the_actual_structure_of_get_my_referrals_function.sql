SELECT 
    proname,
    prosrc
FROM pg_proc 
WHERE proname = 'get_my_referrals';