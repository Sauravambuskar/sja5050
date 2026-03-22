import { supabase } from "@/lib/supabase";

export const AGREEMENT_PDFS_BUCKET = "signed_agreements";

export async function uploadAgreementPdf(params: {
  userId: string;
  agreementId: string;
  kind: "user" | "final";
  pdfBytes: Uint8Array;
}) {
  const { userId, agreementId, kind, pdfBytes } = params;
  const path = `${userId}/${agreementId}.${kind}.pdf`;

  const file = new File([pdfBytes as unknown as Uint8Array<ArrayBuffer>], `agreement-${agreementId}.${kind}.pdf`, {
    type: "application/pdf",
  });

  const { error } = await supabase.storage
    .from(AGREEMENT_PDFS_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: "3600" });

  if (error) throw error;
  return path;
}

export async function createAgreementPdfSignedUrl(path: string, expiresInSeconds = 60 * 30) {
  const { data, error } = await supabase.storage.from(AGREEMENT_PDFS_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
