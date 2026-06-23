"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prepareWorkflowInput, type WorkflowTrigger, type WorkflowAction } from "@/lib/workflows";

export async function createWorkflow(formData: FormData) {
  const input = {
    name: String(formData.get("name") ?? ""),
    trigger: String(formData.get("trigger") ?? "") as WorkflowTrigger,
    action: String(formData.get("action") ?? "") as WorkflowAction,
    template: String(formData.get("template") ?? "")
  };

  const prepared = prepareWorkflowInput(input);
  if (!prepared.ok) redirect(`/app/workflows?error=${encodeURIComponent(prepared.error)}`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  const { error } = await supabase.from("workflow").insert({
    workspace_id: workspace!.id,
    name: prepared.record.name,
    trigger: prepared.record.trigger,
    action: prepared.record.action,
    template: prepared.record.template,
    created_by: user.id
  });

  if (error) {
    console.error("[workflow] insert failed", { message: error.message, code: error.code });
    redirect("/app/workflows?error=save");
  }

  revalidatePath("/app/workflows");
  redirect("/app/workflows?saved=1");
}

export async function toggleWorkflow(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const enabled = String(formData.get("enabled") ?? "false") === "true";
  if (!id) redirect("/app/workflows");

  const supabase = await createClient();
  await supabase.from("workflow").update({ enabled }).eq("id", id);
  revalidatePath("/app/workflows");
  redirect("/app/workflows");
}

export async function deleteWorkflow(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/app/workflows");

  const supabase = await createClient();
  await supabase.from("workflow").delete().eq("id", id);
  revalidatePath("/app/workflows");
  redirect("/app/workflows");
}
