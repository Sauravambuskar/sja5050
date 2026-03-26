SELECT name, public, file_size_limit 
FROM storage.buckets 
WHERE name IN ('agreement_assets', 'signed_agreements');