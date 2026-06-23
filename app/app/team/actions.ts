"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prepareTrainerInvite, type TrainerRole } from "@/lib/trainer-access";

export async function inviteTrainer(formData: FormData) {
  const input = {
    email: String(formData.get("email") ?? ""),
    full_name: String(formData.get("full_name") ?? ""),
    role: String(formData.get("role") ?? "trainer") as TrainerRole
  };
  const prepared = prepareTrainerInvite(input);
  if (!prepared.ok) redirect(`/app/team?error=${encodeURIComponent(prepared.error)}`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  const { error } = await supabase.from("workspace_trainer").insert({
    workspace_id: workspace!.id,
    invite_email: prepared.record.email,
    full_name: prepared.record.full_name,
    role: prepared.record.role,
    status: "invited",
    invite_token: crypto.randomUUID()
  });

  if (error) {
    console.error("[trainer] invite failed", error.message);
    redirect("/app/team?error=already-invited");
  }

  revalidatePath("/app/team");
  redirect("/app/team?saved=1");
}

export async function removeTrainer(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/app/team");

  const supabase = await createClient();
  await supabase.from("workspace_trainer").delete().eq("id", id);
  revalidatePath("/app/team");
  redirect("/app/team");
}

export async function updateTrainerRole(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "trainer") as TrainerRole;
  if (!id) redirect("/app/team");

  const supabase = await createClient();
  await supabase.from("workspace_trainer").update({ role }).eq("id", id);
  revalidatePath("/app/team");
  redirect("/app/team");
}
