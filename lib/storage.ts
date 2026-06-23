import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "transformations";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export function transformationPhotoPath(opts: {
  clientId: string;
  entryId: string;
  pose: string;
  ext: string;
}): string {
  const safePose = opts.pose.replace(/[^a-z0-9]/gi, "").toLowerCase() || "photo";
  const safeExt = opts.ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  return `${opts.clientId}/${opts.entryId}/${safePose}-${Date.now()}.${safeExt}`;
}

export async function uploadTransformationPhoto(
  supabase: SupabaseClient,
  path: string,
  file: File
): Promise<{ path: string } | { error: string }> {
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg"
  });
  if (error || !data) {
    return { error: error?.message ?? "upload failed" };
  }
  return { path: data.path };
}

export async function signTransformationPhoto(
  supabase: SupabaseClient,
  path: string
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function signTransformationPhotos(
  supabase: SupabaseClient,
  paths: string[]
): Promise<Record<string, string | null>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return {};
  const map: Record<string, string | null> = {};
  for (const row of data) {
    if (row.path) {
      map[row.path] = row.signedUrl ?? null;
    }
  }
  return map;
}

export async function deleteTransformationPhoto(
  supabase: SupabaseClient,
  path: string
): Promise<boolean> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  return !error;
}
