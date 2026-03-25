SELECT id, email, raw_user_meta_data->>'full_name' as meta_full_name 
FROM auth.users 
WHERE raw_user_meta_data->>'full_name' ILIKE '%sumit%' 
LIMIT 5;