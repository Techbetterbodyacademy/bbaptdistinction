"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadAvatar, removeAllAvatars } from "@/lib/avatar";
import { uploadAvatarToR2, isR2Configured } from "@/lib/r2";

/**
 * Client-friendly avatar upload that returns a result instead of redirecting.
 * Used by the client-component cropper.
 * Storage backend: Cloudflare R2 (10GB free, no egress fees). Falls back to Supabase
 * Storage only if R2 env vars are not yet configured.
 */
export async function saveProfilePictureClient(
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  let publicUrl: string;

  if (isR2Configured()) {
    const r2 = await uploadAvatarToR2(file as File, user.id);
    if (!r2.ok) {
      console.error("[avatar] r2 upload failed", r2.error);
      return { ok: false, error: r2.error };
    }
    publicUrl = r2.url;
  } else {
    // Fallback: legacy Supabase Storage path. Kept for safety until R2 env vars are set.
    const result = await uploadAvatar(supabase as never, user.id, file as File);
    if (!result.ok) {
      console.error("[avatar] supabase upload failed", result.error);
      return { ok: false, error: result.error };
    }
    publicUrl = result.publicUrl;
  }

  const { error: updateError } = await supabase
    .from("user_profile")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) {
    console.error("[avatar] profile update failed", updateError.message);
    return { ok: false, error: "Saved the file but could not save the link" };
  }

  // Invalidate the LAYOUTS (not just pages) so the sidebar / client nav avatars refresh.
  revalidatePath("/client", "layout");
  revalidatePath("/app", "layout");
  return { ok: true, url: publicUrl };
}

/**
 * Client-friendly removal that returns a result instead of redirecting.
 */
export async function removeProfilePictureClient(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  await removeAllAvatars(supabase as never, user.id);

  const { error } = await supabase
    .from("user_profile")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (error) {
    console.error("[avatar] clear avatar_url failed", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath("/client", "layout");
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function uploadProfilePicture(formData: FormData): Promise<void> {
  const file = formData.get("avatar");
  const role = String(formData.get("role") ?? "client");
  const returnTo = String(formData.get("return_to") ?? (role === "coach" ? "/app/settings/account" : "/client/settings"));

  if (!(file instanceof File) || file.size === 0) {
    redirect(`${returnTo}?error=no_file`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await uploadAvatar(supabase as never, user.id, file as File);
  if (!result.ok) {
    console.error("[avatar] upload failed", result.error);
    redirect(`${returnTo}?error=upload_failed`);
  }

  const { error: updateError } = await supabase
    .from("user_profile")
    .update({ avatar_url: result.publicUrl })
    .eq("id", user.id);

  if (updateError) {
    console.error("[avatar] profile update failed", updateError.message);
    redirect(`${returnTo}?error=save_failed`);
  }

  revalidatePath("/client", "layout");
  revalidatePath("/app", "layout");
  revalidatePath(returnTo);
  redirect(`${returnTo}?saved=avatar`);
}

export async function removeProfilePicture(formData: FormData): Promise<void> {
  const role = String(formData.get("role") ?? "client");
  const returnTo = String(formData.get("return_to") ?? (role === "coach" ? "/app/settings/account" : "/client/settings"));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await removeAllAvatars(supabase as never, user.id);

  const { error } = await supabase
    .from("user_profile")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (error) {
    console.error("[avatar] clear avatar_url failed", error.message);
    redirect(`${returnTo}?error=save_failed`);
  }

  revalidatePath("/client", "layout");
  revalidatePath("/app", "layout");
  revalidatePath(returnTo);
  redirect(`${returnTo}?saved=avatar_removed`);
}
