UPDATE system_settings 
SET agreement_pdf_field_map = '{
  "full_name": "full_name",
  "residential_address": "residential_address",
  "contact_number": "contact_number",
  "email_address": "email_address",
  "government_id_details": "government_id_details",
  "organization_name": "organization_name",
  "authorized_signatory_name": "authorized_signatory_name",
  "agreement_execution_date": "agreement_execution_date",
  "unique_agreement_reference_number": "unique_agreement_reference_number",
  "registered_office_address": "registered_office_address",
  "official_contact_details": "official_contact_details",
  "user_signature": "user_signature",
  "company_signature": "company_signature",
  "admin_signature": "admin_signature",
  "stamp": "stamp"
}'::jsonb
WHERE id = 1;