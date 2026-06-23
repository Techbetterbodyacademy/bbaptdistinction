"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateJSON } from "@/lib/ai";
import { buildPtdParsePrompt } from "@/lib/ptd-import";
import { parseProgramResponse } from "@/lib/program-gen";

export async function importPtdProgram(formData: FormData) {
  const raw = String(formData.get("raw_text") ?? "").trim();
  if (!raw) redirect("/app/programs/import-ptd?error=empty");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  const messages = buildPtdParsePrompt(raw);
  const result = await generateJSON<unknown>({
    messages,
    maxTokens: 6000,
    model: "gpt-4.1"
  });

  if (!result.ok) {
    if (result.error.includes("OPENAI_API_KEY")) redirect("/app/programs/import-ptd?error=key");
    console.error("[ptd-import] AI failed", result.error);
    redirect("/app/programs/import-ptd?error=ai");
  }

  const parsed = parseProgramResponse(JSON.stringify(result.data));
  if (!parsed.ok) {
    console.error("[ptd-import] parse failed", parsed.error);
    redirect("/app/programs/import-ptd?error=parse");
  }

  const program = parsed.program;

  const { data: createdProgram, error: progError } = await supabase
    .from("program")
    .insert({
      workspace_id: workspace!.id,
      name: program.name,
      description: program.description,
      audience: "mixed",
      weeks: program.weeks.length,
      status: "draft",
      created_by: user.id
    })
    .select("id")
    .single();

  if (progError || !createdProgram) {
    console.error("[ptd-import] program insert failed", progError?.message);
    redirect("/app/programs/import-ptd?error=db");
  }

  // Find or create exercises (same pattern as new-ai)
  const { data: existing } = await supabase
    .from("exercise")
    .select("id, name")
    .eq("workspace_id", workspace!.id);
  const exerciseMap = new Map<string, string>();
  (existing ?? []).forEach((e) => exerciseMap.set(e.name.toLowerCase(), e.id));

  const allNames = new Set<string>();
  for (const w of program.weeks) for (const wk of w.workouts) for (const ex of wk.exercises) allNames.add(ex.name);

  const toCreate = [];
  for (const exName of allNames) {
    if (!exerciseMap.has(exName.toLowerCase())) {
      toCreate.push({ workspace_id: workspace!.id, name: exName, created_at: new Date().toISOString() });
    }
  }

  if (toCreate.length > 0) {
    const { data: created } = await supabase.from("exercise").insert(toCreate).select("id, name");
    (created ?? []).forEach((e) => exerciseMap.set(e.name.toLowerCase(), e.id));
  }

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
        console.error("[ptd-import] workout insert failed", workoutError?.message);
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
