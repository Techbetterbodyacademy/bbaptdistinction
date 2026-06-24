"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadAvatar, removeAllAvatars } from "@/lib/avatar";

/**
 * Client-friendly avatar upload that returns a result instead of redirecting.
 * Used by the client-component cropper.
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

  const result = await uploadAvatar(supabase as never, user.id, file as File);
  if (!result.ok) {
    console.error("[avatar] upload failed", result.error);
    return { ok: false, error: result.error };
  }

  const { error: updateError } = await supabase
    .from("user_profile")
    .update({ avatar_url: result.publicUrl })
    .eq("id", user.id);

  if (updateError) {
    console.error("[avatar] profile update failed", updateError.message);
    return { ok: false, error: "Saved the file but could not save the link" };
  }

  revalidatePath("/client");
  revalidatePath("/app");
  return { ok: true, url: result.publicUrl };
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

  revalidatePath("/client");
  revalidatePath("/app");
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

  revalidatePath("/client");
  revalidatePath("/app");
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

  revalidatePath("/client");
  revalidatePath("/app");
  revalidatePath(returnTo);
  redirect(`${returnTo}?saved=avatar_removed`);
}
