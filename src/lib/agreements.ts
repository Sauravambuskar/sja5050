import { supabase } from "@/lib/supabase";

export const AGREEMENT_ASSETS_BUCKET = "agreement_assets";
export const SIGNED_AGREEMENTS_BUCKET = "signed_agreements";

export type AgreementAssets = {
  first_party_name: string | null;
  stamp_path: string | null;
  company_signature_path: string | null;
};

export type AgreementDynamicFields = {
  first_party_name: string;
  second_party_name: string;
  investment_date: string; // ISO date
  invested_amount: number;
  user_investment_id: string | null;
};

export async function fetchAgreementAssets(): Promise<AgreementAssets> {
  const { data, error } = await supabase.rpc("get_agreement_assets");
  if (error) throw error;

  // Supabase returns an array for TABLE returns
  const row = Array.isArray(data) ? data[0] : data;
  return {
    first_party_name: row?.first_party_name ?? null,
    stamp_path: row?.stamp_path ?? null,
    company_signature_path: row?.company_signature_path ?? null,
  };
}

export async function fetchMyAgreementDynamicFields(): Promise<AgreementDynamicFields> {
  const { data, error } = await supabase.rpc("get_my_agreement_dynamic_fields");
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    // Should never happen after RPC fix, but keep safe fallback
    return {
      first_party_name: "",
      second_party_name: "",
      investment_date: new Date().toISOString().slice(0, 10),
      invested_amount: 0,
      user_investment_id: null,
    };
  }

  return {
    first_party_name: row.first_party_name || "",
    second_party_name: row.second_party_name || "",
    investment_date: row.investment_date,
    invested_amount: Number(row.invested_amount || 0),
    user_investment_id: row.user_investment_id ?? null,
  };
}

export async function createSignedUrl(bucket: string, path: string, expiresInSeconds = 60 * 30) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadSignedAgreementPdf(params: {
  userId: string;
  agreementId: string;
  pdfBlob: Blob;
}) {
  const { userId, agreementId, pdfBlob } = params;
  const path = `${userId}/${agreementId}.pdf`;

  const file = new File([pdfBlob], `agreement-${agreementId}.pdf`, { type: "application/pdf" });

  const { error } = await supabase.storage
    .from(SIGNED_AGREEMENTS_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: "3600" });

  if (error) throw error;
  return path;
}
