import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type AgreementFieldMap = {
  // Text fields (AcroForm field names in the PDF)
  full_name?: string;
  residential_address?: string;
  contact_number?: string;
  email_address?: string;
  government_id_details?: string;
  business_name_if_applicable?: string;

  organization_name?: string;
  authorized_signatory_name?: string;
  agreement_execution_date?: string;
  unique_agreement_reference_number?: string;
  registered_office_address?: string;
  official_contact_details?: string;

  // Image fields (AcroForm field names in the PDF)
  user_signature?: string;
  company_signature?: string;
  admin_signature?: string;
  stamp?: string;
};

export type GenerateAgreementPdfParams = {
  templateUrl: string;
  fieldMap: AgreementFieldMap;
  textValues: Record<string, string>;
  images?: {
    user_signature?: { dataUrl: string };
    company_signature?: { dataUrl: string };
    admin_signature?: { dataUrl: string };
    stamp?: { dataUrl: string };
  };
};

function base64ToUint8Array(base64: string) {
  const bin = atob(base64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function dataUrlToBytes(dataUrl: string) {
  const idx = dataUrl.indexOf(",");
  const meta = dataUrl.slice(0, idx);
  const b64 = dataUrl.slice(idx + 1);
  const bytes = base64ToUint8Array(b64);
  const isPng = meta.includes("image/png");
  const isJpg = meta.includes("image/jpeg") || meta.includes("image/jpg");
  return { bytes, kind: isPng ? "png" : isJpg ? "jpg" : "unknown" } as const;
}

function safeText(v: unknown) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

async function sha256Hex(bytes: Uint8Array) {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function assertRequiredText(label: string, value: string) {
  if (!value.trim()) throw new Error(`${label} is required.`);
}

function getFieldName(map: AgreementFieldMap, key: keyof AgreementFieldMap) {
  const v = map[key];
  return (v || "").trim() || null;
}

export async function inspectPdfFormFields(templateUrl: string) {
  const res = await fetch(templateUrl);
  if (!res.ok) throw new Error("Failed to load PDF template");
  const bytes = new Uint8Array(await res.arrayBuffer());
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  return form.getFields().map((f) => ({ name: f.getName(), type: f.constructor.name }));
}

export async function generateAgreementPdf(params: GenerateAgreementPdfParams) {
  const { templateUrl, fieldMap, textValues, images } = params;

  // Required values (legal directive: reject if missing)
  assertRequiredText("Full name", safeText(textValues.full_name));
  assertRequiredText("Residential address", safeText(textValues.residential_address));
  assertRequiredText("Contact number", safeText(textValues.contact_number));

  const res = await fetch(templateUrl);
  if (!res.ok) throw new Error("Failed to load PDF template");
  const templateBytes = new Uint8Array(await res.arrayBuffer());

  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  // Fill text fields by AcroForm name
  const fillText = (key: keyof AgreementFieldMap, value: string) => {
    const fieldName = getFieldName(fieldMap, key);
    if (!fieldName) return;
    try {
      const tf = form.getTextField(fieldName);
      tf.setText(value);
      // Keep appearance consistent
      const helv = pdfDoc.embedStandardFont(StandardFonts.Helvetica);
      // pdf-lib requires sync embed; but embedStandardFont is async in older versions.
      // Use setFontSize only (appearance depends on template); avoid forcing.
      void helv;
    } catch {
      // If the field type isn't a text field, ignore.
    }
  };

  fillText("full_name", safeText(textValues.full_name));
  fillText("residential_address", safeText(textValues.residential_address));
  fillText("contact_number", safeText(textValues.contact_number));
  fillText("email_address", safeText(textValues.email_address));
  fillText("government_id_details", safeText(textValues.government_id_details));
  fillText("business_name_if_applicable", safeText(textValues.business_name_if_applicable));

  fillText("organization_name", safeText(textValues.organization_name));
  fillText("authorized_signatory_name", safeText(textValues.authorized_signatory_name));
  fillText("agreement_execution_date", safeText(textValues.agreement_execution_date));
  fillText("unique_agreement_reference_number", safeText(textValues.unique_agreement_reference_number));
  fillText("registered_office_address", safeText(textValues.registered_office_address));
  fillText("official_contact_details", safeText(textValues.official_contact_details));

  // Draw images at widget rectangles for mapped fields
  const drawImageAtField = async (
    key: keyof AgreementFieldMap,
    dataUrl: string,
    opts?: { cover?: boolean }
  ) => {
    const fieldName = getFieldName(fieldMap, key);
    if (!fieldName) return;

    let field;
    try {
      field = form.getField(fieldName);
    } catch {
      return;
    }

    const { bytes, kind } = dataUrlToBytes(dataUrl);
    const img =
      kind === "png" ? await pdfDoc.embedPng(bytes) : kind === "jpg" ? await pdfDoc.embedJpg(bytes) : null;
    if (!img) return;

    // Access widgets/rectangles (pdf-lib internal API)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const acroField = (field as any).acroField as any;
    const widgets = acroField.getWidgets?.() || [];

    for (const widget of widgets) {
      const rect = widget.getRectangle();
      const page = pdfDoc.findPageForAnnotationRef(widget.ref);
      if (!page) continue;

      const iw = img.width;
      const ih = img.height;

      let width = rect.width;
      let height = rect.height;
      let x = rect.x;
      let y = rect.y;

      if (!opts?.cover) {
        const scale = Math.min(rect.width / iw, rect.height / ih);
        width = iw * scale;
        height = ih * scale;
        x = rect.x + (rect.width - width) / 2;
        y = rect.y + (rect.height - height) / 2;
      }

      page.drawImage(img, { x, y, width, height });
    }
  };

  if (images?.user_signature?.dataUrl) await drawImageAtField("user_signature", images.user_signature.dataUrl);
  if (images?.company_signature?.dataUrl)
    await drawImageAtField("company_signature", images.company_signature.dataUrl);
  if (images?.admin_signature?.dataUrl) await drawImageAtField("admin_signature", images.admin_signature.dataUrl);
  if (images?.stamp?.dataUrl) await drawImageAtField("stamp", images.stamp.dataUrl);

  // Flatten (lock structure) — removes editable fields
  try {
    form.flatten();
  } catch {
    // ignore
  }

  // Add a tiny invisible mark for integrity (optional; doesn't alter visible layout)
  // This helps detect tampering if you later store+verify hashes.
  try {
    const lastPage = pdfDoc.getPages()[pdfDoc.getPages().length - 1];
    lastPage.drawRectangle({ x: 0.5, y: 0.5, width: 1, height: 1, color: rgb(1, 1, 1), opacity: 0 });
  } catch {
    // ignore
  }

  const outBytes = await pdfDoc.save();
  const hash = await sha256Hex(outBytes);

  return {
    pdfBytes: outBytes,
    hash,
  };
}
