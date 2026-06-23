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

function fileOrNull(value: FormDataEntryValue | null): File | null {
  if (!(value instanceof File)) return null;
  if (!value.size) return null;
  return value;
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "file";
}

export async function createResource(formData: FormData) {
  const title = strOrNull(formData.get("title"));
  const kind = strOrNull(formData.get("kind"));
  const audience = strOrNull(formData.get("audience"));
  const externalUrl = strOrNull(formData.get("external_url"));
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const published = String(formData.get("published") ?? "") === "1";
  const file = fileOrNull(formData.get("file"));

  if (!title || !kind) {
    redirect("/app/resources/new?error=missing");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!workspace) {
    redirect("/onboarding");
  }

  const { data: created, error } = await supabase
    .from("resource")
    .insert({
      workspace_id: workspace.id,
      title,
      kind,
      audience,
      external_url: externalUrl,
      tags,
      published
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("[resource] insert failed", { message: error?.message, code: error?.code });
    redirect("/app/resources/new?error=insert");
  }

  if (file) {
    const path = `${workspace.id}/${created.id}/${safeFilename(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("resources")
      .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });

    if (!uploadError) {
      await supabase.from("resource").update({ blob_url: path }).eq("id", created.id);
    } else {
      console.error("[resource] upload failed", uploadError.message);
    }
  }

  revalidatePath("/app/resources");
  redirect("/app/resources");
}
