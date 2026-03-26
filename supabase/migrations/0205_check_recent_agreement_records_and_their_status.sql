SELECT id, user_id, status, company_signature_path, stamp_path, pdf_path, user_pdf_path, admin_signed_at, signed_at 
FROM investment_agreements 
ORDER BY signed_at DESC 
LIMIT 5;