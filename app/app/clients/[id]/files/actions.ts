"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function fileOrNull(value: FormDataEntryValue | null): File | null {
  if (!(value instanceof File)) return null;
  if (!value.size) return null;
  return value;
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

export async function uploadClientFile(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const file = fileOrNull(formData.get("file"));
  const description = String(formData.get("description") ?? "").trim() || null;
  const visible = String(formData.get("visible_to_client") ?? "") === "1";

  if (!clientId || !file) redirect(`/app/clients/${clientId}/files?error=missing`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  // Insert metadata first to get the id
  const { data: created, error: insertError } = await supabase
    .from("client_file")
    .insert({
      client_id: clientId,
      workspace_id: workspace!.id,
      file_name: file.name,
      file_path: "pending",
      file_type: file.type || null,
      file_size_bytes: file.size,
      description,
      uploaded_by: user.id,
      visible_to_client: visible
    })
    .select("id")
    .single();

  if (insertError || !created) {
    console.error("[client-file] insert failed", { message: insertError?.message });
    redirect(`/app/clients/${clientId}/files?error=insert`);
  }

  const path = `${workspace!.id}/${clientId}/${created.id}/${safeFilename(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("client-files")
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });

  if (uploadError) {
    console.error("[client-file] upload failed", uploadError.message);
    await supabase.from("client_file").delete().eq("id", created.id);
    redirect(`/app/clients/${clientId}/files?error=upload`);
  }

  await supabase.from("client_file").update({ file_path: path }).eq("id", created.id);

  revalidatePath(`/app/clients/${clientId}/files`);
  redirect(`/app/clients/${clientId}/files?saved=1`);
}

export async function deleteClientFile(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const fileId = String(formData.get("file_id") ?? "");
  if (!clientId || !fileId) redirect(`/app/clients/${clientId}/files`);

  const supabase = await createClient();
  const { data: file } = await supabase.from("client_file").select("file_path").eq("id", fileId).maybeSingle();
  if (file?.file_path) {
    await supabase.storage.from("client-files").remove([file.file_path]);
  }
  await supabase.from("client_file").delete().eq("id", fileId);

  revalidatePath(`/app/clients/${clientId}/files`);
  redirect(`/app/clients/${clientId}/files?saved=1`);
}

export async function toggleVisibility(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const fileId = String(formData.get("file_id") ?? "");
  const visible = String(formData.get("visible") ?? "0") === "1";
  if (!clientId || !fileId) redirect(`/app/clients/${clientId}/files`);

  const supabase = await createClient();
  await supabase.from("client_file").update({ visible_to_client: visible }).eq("id", fileId);

  revalidatePath(`/app/clients/${clientId}/files`);
  redirect(`/app/clients/${clientId}/files?saved=1`);
}
