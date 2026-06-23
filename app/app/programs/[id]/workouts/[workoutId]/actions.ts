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

export async function updateWorkout(formData: FormData) {
  const programId = String(formData.get("program_id") ?? "");
  const workoutId = String(formData.get("workout_id") ?? "");
  const name = strOrNull(formData.get("name"));
  const notes = strOrNull(formData.get("notes"));

  if (!programId || !workoutId) {
    redirect("/app/programs");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workout")
    .update({ name, notes })
    .eq("id", workoutId);

  if (error) {
    redirect(`/app/programs/${programId}/workouts/${workoutId}?error=update`);
  }

  revalidatePath(`/app/programs/${programId}`);
  redirect(`/app/programs/${programId}/workouts/${workoutId}?saved=1`);
}

export async function deleteWorkout(formData: FormData) {
  const programId = String(formData.get("program_id") ?? "");
  const workoutId = String(formData.get("workout_id") ?? "");

  if (!programId || !workoutId) {
    redirect("/app/programs");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("workout").delete().eq("id", workoutId);

  if (error) {
    redirect(`/app/programs/${programId}/workouts/${workoutId}?error=delete`);
  }

  revalidatePath(`/app/programs/${programId}`);
  redirect(`/app/programs/${programId}`);
}

export async function addWorkoutExercise(formData: FormData) {
  const programId = String(formData.get("program_id") ?? "");
  const workoutId = String(formData.get("workout_id") ?? "");
  const exerciseId = String(formData.get("exercise_id") ?? "");
  const orderIndex = Number(formData.get("order_index") ?? 1);

  if (!programId || !workoutId || !exerciseId) {
    redirect(`/app/programs/${programId}/workouts/${workoutId}?error=add`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("workout_exercise").insert({
    workout_id: workoutId,
    exercise_id: exerciseId,
    order_index: orderIndex,
    target_sets: numOrNull(formData.get("target_sets")),
    target_reps: strOrNull(formData.get("target_reps")),
    target_rpe: numOrNull(formData.get("target_rpe")),
    rest_seconds: numOrNull(formData.get("rest_seconds"))
  });

  if (error) {
    redirect(`/app/programs/${programId}/workouts/${workoutId}?error=add`);
  }

  revalidatePath(`/app/programs/${programId}/workouts/${workoutId}`);
  redirect(`/app/programs/${programId}/workouts/${workoutId}?saved=1`);
}

export async function updateWorkoutExercise(formData: FormData) {
  const programId = String(formData.get("program_id") ?? "");
  const workoutId = String(formData.get("workout_id") ?? "");
  const weId = String(formData.get("we_id") ?? "");

  if (!programId || !workoutId || !weId) {
    redirect(`/app/programs/${programId}/workouts/${workoutId}?error=update`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workout_exercise")
    .update({
      target_sets: numOrNull(formData.get("target_sets")),
      target_reps: strOrNull(formData.get("target_reps")),
      target_rpe: numOrNull(formData.get("target_rpe")),
      rest_seconds: numOrNull(formData.get("rest_seconds")),
      notes: strOrNull(formData.get("notes"))
    })
    .eq("id", weId);

  if (error) {
    redirect(`/app/programs/${programId}/workouts/${workoutId}?error=update`);
  }

  revalidatePath(`/app/programs/${programId}/workouts/${workoutId}`);
  redirect(`/app/programs/${programId}/workouts/${workoutId}?saved=1`);
}

export async function removeWorkoutExercise(formData: FormData) {
  const programId = String(formData.get("program_id") ?? "");
  const workoutId = String(formData.get("workout_id") ?? "");
  const weId = String(formData.get("we_id") ?? "");

  if (!programId || !workoutId || !weId) {
    redirect(`/app/programs/${programId}/workouts/${workoutId}?error=remove`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("workout_exercise").delete().eq("id", weId);

  if (error) {
    redirect(`/app/programs/${programId}/workouts/${workoutId}?error=remove`);
  }

  revalidatePath(`/app/programs/${programId}/workouts/${workoutId}`);
  redirect(`/app/programs/${programId}/workouts/${workoutId}?saved=1`);
}
