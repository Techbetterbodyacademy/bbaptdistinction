import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "avatars";
const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif"] as const;
const MAX_BYTES = 5 * 1024 * 1024;

export function avatarPath(userId: string, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  return `${userId}/avatar.${safeExt}`;
}

export function getPublicAvatarUrl(supabase: SupabaseClient, path: string): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

export type UploadAvatarResult =
  | { ok: true; path: string; publicUrl: string }
  | { ok: false; error: string };

export async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<UploadAvatarResult> {
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Image must be under 5MB" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  if (!(ALLOWED_EXT as readonly string[]).includes(ext)) {
    return { ok: false, error: "Use JPG, PNG, WebP, or GIF" };
  }

  // Remove any existing avatar for this user (any extension) before uploading
  await removeAllAvatars(supabase, userId);

  const path = avatarPath(userId, ext);
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || "image/jpeg"
  });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const publicUrl = getPublicAvatarUrl(supabase, path);
  if (!publicUrl) {
    return { ok: false, error: "Could not resolve public URL" };
  }
  return { ok: true, path, publicUrl };
}

export async function removeAllAvatars(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data } = await supabase.storage.from(BUCKET).list(userId);
  if (!data || data.length === 0) return;
  const paths = data.map((f) => `${userId}/${f.name}`);
  await supabase.storage.from(BUCKET).remove(paths);
}
