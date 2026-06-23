"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LifecycleStage } from "@/lib/jase-watches";

const VALID_STAGES: LifecycleStage[] = [
  "onboarding",
  "kickoff",
  "momentum",
  "celebration",
  "challenge_upgrade",
  "catchup_call",
  "retreat",
  "renewed",
  "offboarded"
];

export async function setClientStage(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const stage = String(formData.get("stage") ?? "") as LifecycleStage;
  if (!clientId || !VALID_STAGES.includes(stage)) {
    redirect(`/app/clients/${clientId}?error=stage`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date().toISOString();
  const update: {
    lifecycle_stage: LifecycleStage;
    stage_entered_at: string;
    renewed_at?: string;
    offboarded_at?: string;
  } = {
    lifecycle_stage: stage,
    stage_entered_at: now
  };
  if (stage === "renewed") update.renewed_at = now;
  if (stage === "offboarded") update.offboarded_at = now;

  const { error } = await supabase.from("client_profile").update(update).eq("id", clientId);
  if (error) {
    console.error("[stage] update failed", error.message);
    redirect(`/app/clients/${clientId}?error=stage`);
  }

  revalidatePath(`/app/clients/${clientId}`);
  revalidatePath("/app/watches");
  redirect(`/app/clients/${clientId}?stage_saved=1`);
}
