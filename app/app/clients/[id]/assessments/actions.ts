"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prepareAssessmentInput, type AssessmentKind } from "@/lib/assessment";

export async function createAssessment(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const title = String(formData.get("title") ?? "");
  const kind = String(formData.get("kind") ?? "postural") as AssessmentKind;
  const notes = String(formData.get("notes") ?? "");

  const prepared = prepareAssessmentInput({ title, kind, notes });
  if (!prepared.ok) {
    redirect(`/app/clients/${clientId}/assessments?error=${encodeURIComponent(prepared.error)}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  const { error } = await supabase.from("assessment").insert({
    workspace_id: workspace!.id,
    client_id: clientId,
    title: prepared.record.title,
    kind: prepared.record.kind,
    notes: prepared.record.notes,
    created_by: user.id
  });

  if (error) {
    console.error("[assessment] insert failed", { message: error.message, code: error.code });
    redirect(`/app/clients/${clientId}/assessments?error=save`);
  }

  revalidatePath(`/app/clients/${clientId}/assessments`);
  redirect(`/app/clients/${clientId}/assessments?saved=1`);
}
