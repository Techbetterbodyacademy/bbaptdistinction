"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function strOrNull(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}

export async function updatePost(formData: FormData) {
  const postId = String(formData.get("post_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!postId) redirect("/app/clients");

  const supabase = await createClient();
  const { error } = await supabase
    .from("transformation_post")
    .update({
      hook: strOrNull(formData.get("hook")),
      caption: strOrNull(formData.get("caption")),
      hashtags: strOrNull(formData.get("hashtags")),
      updated_at: new Date().toISOString()
    })
    .eq("id", postId);

  if (error) {
    redirect(`/app/clients/${clientId}/posts/${postId}?error=update`);
  }

  revalidatePath(`/app/clients/${clientId}/posts`);
  redirect(`/app/clients/${clientId}/posts/${postId}?saved=1`);
}

export async function setPostStatus(formData: FormData) {
  const postId = String(formData.get("post_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!postId || !["draft", "ready", "published", "archived"].includes(status)) {
    redirect(`/app/clients/${clientId}/posts/${postId}?error=status`);
  }

  const supabase = await createClient();
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "published") {
    updates.published_at = new Date().toISOString();
  }

  const { error } = await supabase.from("transformation_post").update(updates).eq("id", postId);

  if (error) {
    redirect(`/app/clients/${clientId}/posts/${postId}?error=status`);
  }

  revalidatePath(`/app/clients/${clientId}/posts`);
  redirect(`/app/clients/${clientId}/posts/${postId}?saved=1`);
}

export async function deletePost(formData: FormData) {
  const postId = String(formData.get("post_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!postId) redirect(`/app/clients/${clientId}/posts`);

  const supabase = await createClient();
  await supabase.from("transformation_post").delete().eq("id", postId);

  revalidatePath(`/app/clients/${clientId}/posts`);
  redirect(`/app/clients/${clientId}/posts`);
}
