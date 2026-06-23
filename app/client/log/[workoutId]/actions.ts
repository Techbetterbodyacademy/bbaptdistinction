"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function numOrNull(value: FormDataEntryValue | null): number | null {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

function strOrNull(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}

export async function startOrResumeSession(formData: FormData) {
  const workoutId = String(formData.get("workout_id") ?? "");
  if (!workoutId) {
    redirect("/client/program");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clientProfile } = await supabase
    .from("client_profile")
    .select("id")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!clientProfile) {
    redirect("/client");
  }

  const { data: activeAssignment } = await supabase
    .from("program_assignment")
    .select("id")
    .eq("client_id", clientProfile.id)
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: session, error } = await supabase
    .from("workout_session")
    .insert({
      client_id: clientProfile.id,
      workout_id: workoutId,
      assignment_id: activeAssignment?.id ?? null,
      performed_at: new Date().toISOString()
    })
    .select("id")
    .single();

  if (error || !session) {
    redirect(`/client/log/${workoutId}?error=start`);
  }

  revalidatePath(`/client/log/${workoutId}`);
  redirect(`/client/log/${workoutId}?sessionId=${session.id}`);
}

export async function logSession(formData: FormData) {
  const sessionId = String(formData.get("session_id") ?? "");
  const workoutId = String(formData.get("workout_id") ?? "");
  const finish = String(formData.get("finish") ?? "0") === "1";

  if (!sessionId || !workoutId) {
    redirect(`/client/program`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clientProfile } = await supabase
    .from("client_profile")
    .select("id")
    .eq("user_id", user!.id)
    .maybeSingle();
  if (!clientProfile) {
    redirect("/client");
  }

  const { data: session } = await supabase
    .from("workout_session")
    .select("id, client_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.client_id !== clientProfile.id) {
    redirect(`/client/log/${workoutId}?error=session`);
  }

  const logs: Array<{ session_id: string; exercise_id: string; set_number: number; reps: number | null; weight_kg: number | null; rpe: number | null }> = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("reps__") && !key.startsWith("weight__") && !key.startsWith("rpe__")) continue;
  }

  const grouped = new Map<string, { reps: number | null; weight_kg: number | null; rpe: number | null }>();
  for (const [key, value] of formData.entries()) {
    const match = key.match(/^(reps|weight|rpe)__([^_]+)__(\d+)$/);
    if (!match) continue;
    const [, field, exerciseId, setStr] = match;
    const groupKey = `${exerciseId}:${setStr}`;
    const existing = grouped.get(groupKey) ?? { reps: null, weight_kg: null, rpe: null };
    if (field === "reps") existing.reps = numOrNull(value);
    if (field === "weight") existing.weight_kg = numOrNull(value);
    if (field === "rpe") existing.rpe = numOrNull(value);
    grouped.set(groupKey, existing);
  }

  for (const [groupKey, vals] of grouped.entries()) {
    if (vals.reps == null && vals.weight_kg == null && vals.rpe == null) continue;
    const [exerciseId, setStr] = groupKey.split(":");
    logs.push({
      session_id: sessionId,
      exercise_id: exerciseId,
      set_number: Number(setStr),
      reps: vals.reps,
      weight_kg: vals.weight_kg,
      rpe: vals.rpe
    });
  }

  if (logs.length > 0) {
    await supabase.from("exercise_log").delete().eq("session_id", sessionId);
    const { error: insertError } = await supabase.from("exercise_log").insert(logs);
    if (insertError) {
      redirect(`/client/log/${workoutId}?sessionId=${sessionId}&error=logs`);
    }
  }

  const sessionUpdates: Record<string, unknown> = {
    duration_minutes: numOrNull(formData.get("duration_minutes")),
    overall_rpe: numOrNull(formData.get("overall_rpe")),
    notes: strOrNull(formData.get("notes"))
  };

  await supabase.from("workout_session").update(sessionUpdates).eq("id", sessionId);

  revalidatePath(`/client/log/${workoutId}`);
  revalidatePath("/client/sessions");

  if (finish) {
    redirect(`/client/sessions/${sessionId}`);
  }

  redirect(`/client/log/${workoutId}?sessionId=${sessionId}`);
}
