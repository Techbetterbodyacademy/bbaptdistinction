"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function strOrNull(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}

function parseTags(input: string): string[] | null {
  const cleaned = input.split(",").map((t) => t.trim()).filter(Boolean);
  return cleaned.length ? cleaned : null;
}

export async function updateResource(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/app/resources");

  const title = strOrNull(formData.get("title"));
  const kind = strOrNull(formData.get("kind"));
  const audience = strOrNull(formData.get("audience"));
  const externalUrl = strOrNull(formData.get("external_url"));
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const published = String(formData.get("published") ?? "") === "1";

  if (!title || !kind) {
    redirect(`/app/resources/${id}/edit?error=missing`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("resource")
    .update({ title, kind, audience, external_url: externalUrl, tags, published })
    .eq("id", id);

  if (error) {
    redirect(`/app/resources/${id}/edit?error=update`);
  }

  revalidatePath("/app/resources");
  redirect(`/app/resources/${id}/edit?saved=1`);
}

export async function deleteResource(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/app/resources");

  const supabase = await createClient();
  const { data: resource } = await supabase
    .from("resource")
    .select("blob_url")
    .eq("id", id)
    .maybeSingle();

  if (resource?.blob_url) {
    await supabase.storage.from("resources").remove([resource.blob_url]);
  }

  await supabase.from("resource").delete().eq("id", id);

  revalidatePath("/app/resources");
  redirect("/app/resources");
}
