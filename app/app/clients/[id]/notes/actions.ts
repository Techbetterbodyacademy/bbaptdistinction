"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createNote(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!clientId || !body) redirect(`/app/clients/${clientId}/notes?error=missing`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("coach_note").insert({
    client_id: clientId,
    coach_id: user.id,
    body
  });

  if (error) {
    console.error("[coach-note] insert failed", { message: error.message, code: error.code });
    redirect(`/app/clients/${clientId}/notes?error=insert`);
  }

  revalidatePath(`/app/clients/${clientId}/notes`);
  redirect(`/app/clients/${clientId}/notes?saved=1`);
}

export async function deleteNote(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const noteId = String(formData.get("note_id") ?? "");
  if (!clientId || !noteId) redirect(`/app/clients/${clientId}/notes`);

  const supabase = await createClient();
  await supabase.from("coach_note").delete().eq("id", noteId);

  revalidatePath(`/app/clients/${clientId}/notes`);
  redirect(`/app/clients/${clientId}/notes?saved=1`);
}
