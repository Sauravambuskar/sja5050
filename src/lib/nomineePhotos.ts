import { supabase } from "@/lib/supabase";

export const NOMINEE_PHOTOS_BUCKET = "nominee_photos";

export function buildNomineePhotoPath(userId: string, nomineeId: string, fileExt: string) {
  const safeExt = fileExt.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  return `${userId}/${nomineeId}.${safeExt}`;
}

export async function uploadNomineePhoto(params: {
  userId: string;
  nomineeId: string;
  file: File;
}) {
  const { userId, nomineeId, file } = params;
  const fileExt = file.name.split(".").pop() || "jpg";
  const path = buildNomineePhotoPath(userId, nomineeId, fileExt);

  // Upsert so updating the photo replaces old one (same path)
  const { error } = await supabase.storage
    .from(NOMINEE_PHOTOS_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: "3600" });

  if (error) throw error;

  return path;
}

export async function getNomineePhotoSignedUrl(params: {
  path: string;
  expiresIn?: number;
}) {
  const { path, expiresIn = 60 * 60 } = params;

  const { data, error } = await supabase.storage
    .from(NOMINEE_PHOTOS_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}
