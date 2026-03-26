# Agreement System Setup Guide

## Overview

The agreement system allows users to digitally sign investment agreements, which are then finalized by admins with company signatures and stamps.

## Current Issues & Solutions

### Issue 1: Stamp and Signature Not Visible on PDF

**Root Cause:** The PDF field mapping was empty, so the system didn't know where to place signatures and stamps in the PDF template.

**Solution:** ✅ Fixed - Default field mapping has been applied to the database.

### Issue 2: Agreements Showing "Pending" Status

**Root Cause:**
- No company signature uploaded
- No stamp uploaded
- Agreements remain in "user_signed" status until finalized by admin

**Solution:** Follow the setup steps below.

---

## Setup Instructions

### Step 1: Upload Company Signature and Stamp

1. Go to **System Management** > **Agreement Assets**
2. Upload the **Company Signature** image (PNG/JPG recommended)
3. Upload the **Stamp** image (PNG/JPG recommended)
4. Enter the **First Party Name** (e.g., "SJA Foundation")
5. Click **Save Assets**

**Important:**
- Use transparent PNG images for best results
- Recommended size: 200-300px width
- Keep file sizes under 500KB

### Step 2: Configure PDF Template Field Mapping

1. Go to **System Management** > **PDF Template Field Mapping**
2. Verify the template URL (default: `/agreement-templates/PGS_2.pdf`)
3. Click **Inspect PDF Fields** to see available form fields in your PDF
4. Click **Load Recommended Mapping** to auto-fill the field names
5. Review and adjust mappings if needed:
   - **Text Fields:** full_name, residential_address, contact_number, etc.
   - **Image Fields:** user_signature, company_signature, admin_signature, stamp
6. Click **Save Field Mapping**

**Note:** Your PDF template must have form fields with these exact names for the mapping to work.

### Step 3: Customize Agreement Text (Optional)

1. Go to **System Management** > **Investment Agreement Template**
2. Edit the agreement text as needed
3. Use placeholders for dynamic content:
   - `{{first_party_name}}` - Company name
   - `{{second_party_name}}` - User's full name
   - `{{agreement_date}}` - Agreement date
   - `{{invested_amount}}` - Investment amount
   - `{{invested_amount_words}}` - Amount in words
   - `{{lender_aadhaar}}` - User's Aadhaar
   - `{{lender_pan}}` - User's PAN
   - `{{nominee}}` - Nominee name
4. Click **Save Agreement**

---

## User Flow

### For Users:

1. User navigates to **Agreement** page
2. Fills in their details (auto-filled from profile)
3. Reviews the agreement text
4. Signs digitally using the signature pad
5. Clicks **Generate Agreement & Submit**
6. Status changes to **"Pending Admin Approval"**

### For Admins:

1. Go to **User Management** > Select a user
2. Navigate to **Agreement** tab
3. Review the user's signed agreement
4. Add admin signature in the signature pad
5. Click **Finalize & Store PDF**
6. System automatically:
   - Adds company signature
   - Adds stamp (if uploaded)
   - Generates final PDF
   - Updates status to **"Finalized"**
7. Download and verify the final PDF

---

## Status Meanings

| Status | Description | Action Required |
|--------|-------------|-----------------|
| Not signed | User hasn't signed yet | User needs to sign |
| User signed / Pending Admin Approval | User signed, waiting for admin | Admin needs to finalize |
| Finalized | Agreement complete with all signatures | No action needed |

---

## Troubleshooting

### Signatures/Stamp Not Appearing in PDF

**Check:**
1. ✅ Company signature uploaded in Agreement Assets?
2. ✅ Stamp uploaded in Agreement Assets?
3. ✅ PDF field mapping configured correctly?
4. ✅ PDF template has form fields with correct names?

**Solution:**
- Re-upload signature/stamp images
- Verify field mapping matches PDF form field names
- Use "Inspect PDF Fields" to see available fields

### Agreement Stuck in "Pending" Status

**Check:**
1. ✅ User has signed the agreement?
2. ✅ Admin has finalized the agreement?
3. ✅ Company signature uploaded?

**Solution:**
- Ask user to sign if not done
- Admin must finalize with signature
- Upload company signature first

### PDF Generation Fails

**Check:**
1. ✅ PDF template file exists and is accessible?
2. ✅ All required fields are filled?
3. ✅ Images are valid format (PNG/JPG)?

**Solution:**
- Verify template URL is correct
- Check browser console for errors
- Ensure images are not corrupted

---

## PDF Template Requirements

Your PDF template must include:

### Required Text Fields:
- `full_name` - User's full name
- `residential_address` - User's address
- `contact_number` - User's phone number
- `email_address` - User's email

### Optional Text Fields:
- `government_id_details` - Aadhaar/PAN info
- `organization_name` - Company name
- `authorized_signatory_name` - Signatory name
- `agreement_execution_date` - Date
- `unique_agreement_reference_number` - Reference number
- `registered_office_address` - Office address
- `official_contact_details` - Contact info

### Required Image Fields:
- `user_signature` - User's signature (signature field)
- `company_signature` - Company signature (signature field)
- `admin_signature` - Admin signature (signature field)
- `stamp` - Company stamp (signature field)

**Note:** Image fields must be created as "Signature" fields in your PDF editor, not text fields.

---

## Best Practices

1. **Always test with a sample agreement** before going live
2. **Keep backup copies** of your PDF template
3. **Use high-quality images** for signatures and stamps
4. **Regularly verify** that finalized PDFs are generating correctly
5. **Keep the agreement text** clear and legally sound
6. **Document any customizations** to the template or mapping

---

## Support

If you encounter issues:

1. Check browser console for error messages
2. Verify all setup steps are completed
3. Test with a new user agreement
4. Contact technical support with:
   - Error messages
   - Screenshots
   - Steps to reproduce

---

## Quick Reference

**System Management > Agreement Assets**
- Upload company signature
- Upload stamp
- Set first party name

**System Management > PDF Template Field Mapping**
- Configure field names
- Inspect PDF fields
- Save mapping

**System Management > Investment Agreement Template**
- Edit agreement text
- Use placeholders
- Save changes

**User Management > User > Agreement Tab**
- View user's signed agreement
- Add admin signature
- Finalize agreement
- Download final PDF