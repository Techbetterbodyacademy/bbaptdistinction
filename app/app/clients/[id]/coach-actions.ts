"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { prepareCoachReassign } from "@/lib/coach-reassign";

export async function reassignCoach(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const coachId = String(formData.get("coach_id") ?? "");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id, owner_id")
    .eq("owner_id", user.id)
    .single();

  if (!workspace) redirect("/onboarding");

  const service = createServiceClient();
  const { data: trainers } = await service
    .from("workspace_trainer")
    .select("user_id")
    .eq("workspace_id", workspace.id)
    .eq("status", "accepted");

  const accepted_trainer_ids = (trainers ?? [])
    .map((t) => t.user_id)
    .filter((id): id is string => typeof id === "string");

  const prepared = prepareCoachReassign({
    client_id: clientId,
    coach_id: coachId,
    workspace_owner_id: workspace.owner_id,
    accepted_trainer_ids
  });

  if (!prepared.ok) {
    redirect(`/app/clients/${clientId}?error=${encodeURIComponent(prepared.error)}`);
  }

  const { error } = await service
    .from("client_profile")
    .update({ coach_id: coachId })
    .eq("id", clientId)
    .eq("workspace_id", workspace.id);

  if (error) {
    console.error("[reassign-coach] update failed", error.message);
    redirect(`/app/clients/${clientId}?error=coach_save`);
  }

  revalidatePath(`/app/clients/${clientId}`);
  revalidatePath("/app/team/workload");
  redirect(`/app/clients/${clientId}?coach_saved=1`);
}
