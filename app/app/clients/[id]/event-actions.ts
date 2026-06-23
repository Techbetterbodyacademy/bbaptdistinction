"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  prepareLifecycleEvent,
  stageFromEventType,
  type LifecycleEventType
} from "@/lib/lifecycle-event";

export async function scheduleLifecycleEvent(formData: FormData) {
  const client_id = String(formData.get("client_id") ?? "");
  const event_type = String(formData.get("event_type") ?? "catchup_call") as LifecycleEventType;
  const scheduled_for_raw = String(formData.get("scheduled_for") ?? "");
  const duration_minutes = Number(formData.get("duration_minutes") ?? 30);
  const notes = String(formData.get("notes") ?? "");
  const move_stage = formData.get("move_stage") === "on";

  const scheduled_for = scheduled_for_raw ? new Date(scheduled_for_raw).toISOString() : "";

  const prepared = prepareLifecycleEvent({
    client_id,
    event_type,
    scheduled_for,
    duration_minutes,
    notes
  });
  if (!prepared.ok) {
    redirect(`/app/clients/${client_id}?error=${encodeURIComponent(prepared.error)}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  const { error } = await supabase.from("lifecycle_event").insert({
    workspace_id: workspace!.id,
    client_id: prepared.record.client_id,
    event_type: prepared.record.event_type,
    scheduled_for: prepared.record.scheduled_for,
    duration_minutes: prepared.record.duration_minutes,
    notes: prepared.record.notes,
    created_by: user.id
  });

  if (error) {
    console.error("[lifecycle-event] insert failed", { message: error.message, code: error.code });
    redirect(`/app/clients/${client_id}?error=event_save`);
  }

  if (move_stage) {
    const stage = stageFromEventType(prepared.record.event_type);
    if (stage) {
      await supabase
        .from("client_profile")
        .update({ lifecycle_stage: stage, stage_entered_at: new Date().toISOString() })
        .eq("id", client_id);
    }
  }

  revalidatePath(`/app/clients/${client_id}`);
  revalidatePath("/app/watches");
  revalidatePath("/app/calendar");
  redirect(`/app/clients/${client_id}?event_saved=1`);
}

export async function markEventComplete(formData: FormData) {
  const event_id = String(formData.get("event_id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  const outcome = String(formData.get("outcome") ?? "");

  const supabase = await createClient();
  await supabase
    .from("lifecycle_event")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      outcome: outcome.trim() || null
    })
    .eq("id", event_id);

  revalidatePath(`/app/clients/${client_id}`);
  revalidatePath("/app/watches");
  redirect(`/app/clients/${client_id}`);
}

export async function cancelEvent(formData: FormData) {
  const event_id = String(formData.get("event_id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");

  const supabase = await createClient();
  await supabase.from("lifecycle_event").update({ status: "cancelled" }).eq("id", event_id);

  revalidatePath(`/app/clients/${client_id}`);
  revalidatePath("/app/watches");
  redirect(`/app/clients/${client_id}`);
}
