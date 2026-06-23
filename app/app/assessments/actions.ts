"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prepareTemplateInput } from "@/lib/assessment-template";
import type { AssessmentKind } from "@/lib/assessment";

export async function createTemplate(formData: FormData) {
  const input = {
    title: String(formData.get("title") ?? ""),
    kind: String(formData.get("kind") ?? "postural") as AssessmentKind,
    description: String(formData.get("description") ?? "")
  };
  const prepared = prepareTemplateInput(input);
  if (!prepared.ok) redirect(`/app/assessments?error=${encodeURIComponent(prepared.error)}`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  const { data: created, error } = await supabase
    .from("assessment_template")
    .insert({
      workspace_id: workspace!.id,
      ...prepared.record,
      created_by: user.id
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("[template] insert failed", error?.message);
    redirect("/app/assessments?error=save");
  }

  revalidatePath("/app/assessments");
  redirect(`/app/assessments/${created.id}`);
}
