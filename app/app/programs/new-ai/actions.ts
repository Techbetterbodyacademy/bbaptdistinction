"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateJSON } from "@/lib/ai";
import { buildProgramPrompt, parseProgramResponse } from "@/lib/program-gen";

function numOrNull(value: FormDataEntryValue | null): number | null {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

function strOrNull(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}

export async function generateProgram(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim() || "Untitled program";
  const audience = String(formData.get("audience") ?? "mixed");
  const weeks = Math.max(1, Math.min(52, Number(formData.get("weeks") ?? 12) || 12));
  const sessions_per_week = Math.max(1, Math.min(7, Number(formData.get("sessions_per_week") ?? 3) || 3));
  const goal = String(formData.get("goal") ?? "general fitness");
  const constraints = String(formData.get("constraints") ?? "").trim();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  const messages = buildProgramPrompt({ name, audience, weeks, sessions_per_week, goal, constraints: constraints || undefined });

  const result = await generateJSON<unknown>({
    messages,
    maxTokens: 4096,
    model: "gpt-4.1"
  });

  if (!result.ok) {
    console.error("[program-gen] AI failed", result.error);
    if (result.error.includes("OPENAI_API_KEY")) {
      redirect("/app/programs/new-ai?error=key");
    }
    redirect("/app/programs/new-ai?error=ai");
  }

  const parsed = parseProgramResponse(JSON.stringify(result.data));
  if (!parsed.ok) {
    console.error("[program-gen] parse failed", parsed.error);
    redirect("/app/programs/new-ai?error=parse");
  }

  const program = parsed.program;

  // Insert the program record
  const { data: createdProgram, error: progError } = await supabase
    .from("program")
    .insert({
      workspace_id: workspace!.id,
      name: program.name,
      description: program.description,
      audience,
      weeks,
      status: "draft",
      created_by: user.id
    })
    .select("id")
    .single();

  if (progError || !createdProgram) {
    console.error("[program-gen] program insert failed", progError?.message);
    redirect("/app/programs/new-ai?error=db");
  }

  // Load existing exercises for matching, then create missing exercises in one batch
  const { data: existing } = await supabase
    .from("exercise")
    .select("id, name")
    .eq("workspace_id", workspace!.id);
  const exerciseMap = new Map<string, string>();
  (existing ?? []).forEach((e) => exerciseMap.set(e.name.toLowerCase(), e.id));

  const allExerciseNames = new Set<string>();
  for (const w of program.weeks) {
    for (const wk of w.workouts) {
      for (const ex of wk.exercises) allExerciseNames.add(ex.name);
    }
  }

  const toCreate: Array<{ workspace_id: string; name: string; created_at: string }> = [];
  for (const exName of allExerciseNames) {
    if (!exerciseMap.has(exName.toLowerCase())) {
      toCreate.push({ workspace_id: workspace!.id, name: exName, created_at: new Date().toISOString() });
    }
  }

  if (toCreate.length > 0) {
    const { data: created } = await supabase.from("exercise").insert(toCreate).select("id, name");
    (created ?? []).forEach((e) => exerciseMap.set(e.name.toLowerCase(), e.id));
  }

  // Insert each workout and its exercises
  for (const w of program.weeks) {
    for (const wk of w.workouts) {
      const { data: createdWorkout, error: workoutError } = await supabase
        .from("workout")
        .insert({
          program_id: createdProgram.id,
          week_number: w.week_number,
          day_number: wk.day_number,
          name: wk.name,
          notes: wk.notes,
          order_index: wk.day_number
        })
        .select("id")
        .single();

      if (workoutError || !createdWorkout) {
        console.error("[program-gen] workout insert failed", workoutError?.message);
        continue;
      }

      const exerciseRows = wk.exercises.map((ex, idx) => ({
        workout_id: createdWorkout.id,
        exercise_id: exerciseMap.get(ex.name.toLowerCase())!,
        order_index: idx + 1,
        target_sets: ex.target_sets,
        target_reps: ex.target_reps,
        target_rpe: ex.target_rpe,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes
      }));

      if (exerciseRows.length > 0) {
        await supabase.from("workout_exercise").insert(exerciseRows);
      }
    }
  }

  redirect(`/app/programs/${createdProgram.id}`);
}
