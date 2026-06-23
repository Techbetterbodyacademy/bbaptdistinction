import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  updateWorkout,
  deleteWorkout,
  addWorkoutExercise,
  removeWorkoutExercise,
  updateWorkoutExercise
} from "./actions";

export default async function WorkoutDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string; workoutId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id: programId, workoutId } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const { data: program } = await supabase
    .from("program")
    .select("id, name")
    .eq("id", programId)
    .eq("workspace_id", workspace!.id)
    .maybeSingle();

  if (!program) {
    notFound();
  }

  const { data: workout } = await supabase
    .from("workout")
    .select("id, week_number, day_number, name, notes, program_id")
    .eq("id", workoutId)
    .eq("program_id", programId)
    .maybeSingle();

  if (!workout) {
    notFound();
  }

  const [{ data: workoutExercises }, { data: library }] = await Promise.all([
    supabase
      .from("workout_exercise")
      .select("id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds, notes, exercise:exercise_id(id, name, category, default_unit)")
      .eq("workout_id", workout.id)
      .order("order_index"),
    supabase
      .from("exercise")
      .select("id, name, category")
      .eq("workspace_id", workspace!.id)
      .order("name")
  ]);

  const nextOrderIndex = (workoutExercises?.length ?? 0) + 1;

  return (
    <main className="px-10 py-10 max-w-4xl">
      <Link href={`/app/programs/${programId}`} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; {program.name}
      </Link>

      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Week {workout.week_number} · Day {workout.day_number}
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          {workout.name || "Untitled workout"}
        </h1>
      </header>

      {sp.saved === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Saved.</div>
      ) : null}

      <form action={updateWorkout} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-6">
        <input type="hidden" name="program_id" value={programId} />
        <input type="hidden" name="workout_id" value={workout.id} />
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-4">
          Details
        </h2>
        <div className="mb-4">
          <label className="label" htmlFor="name">Workout name</label>
          <input id="name" name="name" type="text" defaultValue={workout.name ?? ""} className="input" />
        </div>
        <div className="mb-4">
          <label className="label" htmlFor="notes">Notes for the client</label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={workout.notes ?? ""}
            placeholder="Warm up with 5 minutes on the bike. Focus on slow eccentrics on the squats."
            className="input resize-y"
          />
        </div>
        <button type="submit" className="btn btn-primary">Save details</button>
      </form>

      <section className="mb-6">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-4">
          Exercises ({workoutExercises?.length ?? 0})
        </h2>

        {(!workoutExercises || workoutExercises.length === 0) ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)] mb-4">
            No exercises yet. Add the first one below.
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {workoutExercises.map((we, i) => {
              const ex = Array.isArray(we.exercise) ? we.exercise[0] : we.exercise;
              return (
                <ExerciseRow
                  key={we.id}
                  index={i + 1}
                  workoutExercise={we}
                  exercise={ex}
                  programId={programId}
                  workoutId={workout.id}
                />
              );
            })}
          </div>
        )}

        <AddExerciseForm
          programId={programId}
          workoutId={workout.id}
          library={library ?? []}
          nextOrderIndex={nextOrderIndex}
        />
      </section>

      <form action={deleteWorkout} className="mt-10 bg-[var(--color-surface)] border border-[rgba(239,68,68,0.2)] rounded-2xl p-6">
        <input type="hidden" name="program_id" value={programId} />
        <input type="hidden" name="workout_id" value={workout.id} />
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-bold mb-1">Delete this workout</div>
            <div className="text-sm text-[var(--color-muted)]">
              Removes the workout and all its exercises from the program.
            </div>
          </div>
          <button type="submit" className="btn btn-ghost border-[rgba(239,68,68,0.4)] text-[var(--color-danger)]">
            Delete workout
          </button>
        </div>
      </form>
    </main>
  );
}

function ExerciseRow({
  index,
  workoutExercise,
  exercise,
  programId,
  workoutId
}: {
  index: number;
  workoutExercise: {
    id: string;
    target_sets: number | null;
    target_reps: string | null;
    target_rpe: number | null;
    rest_seconds: number | null;
    notes: string | null;
  };
  exercise: { id: string; name: string; category: string | null; default_unit: string | null } | undefined;
  programId: string;
  workoutId: string;
}) {
  return (
    <details className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl overflow-hidden group">
      <summary className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[rgba(255,255,255,0.02)]">
        <div className="shrink-0 w-8 h-8 rounded-full bg-[rgba(0,174,239,0.15)] text-[var(--color-blue-glow)] font-extrabold text-xs flex items-center justify-center">
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{exercise?.name ?? "Missing exercise"}</div>
          <div className="text-xs text-[var(--color-muted)] mt-0.5">
            {workoutExercise.target_sets ?? "—"} sets
            {workoutExercise.target_reps ? ` × ${workoutExercise.target_reps}` : ""}
            {workoutExercise.target_rpe ? ` @ RPE ${workoutExercise.target_rpe}` : ""}
            {workoutExercise.rest_seconds ? ` · ${workoutExercise.rest_seconds}s rest` : ""}
          </div>
        </div>
        <span className="text-[var(--color-subtle)] text-xs group-open:hidden">Edit</span>
        <span className="text-[var(--color-subtle)] text-xs hidden group-open:inline">Close</span>
      </summary>
      <form action={updateWorkoutExercise} className="p-5 border-t border-[var(--color-line)] bg-[var(--color-bg-deep)]">
        <input type="hidden" name="program_id" value={programId} />
        <input type="hidden" name="workout_id" value={workoutId} />
        <input type="hidden" name="we_id" value={workoutExercise.id} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="label" htmlFor={`sets-${workoutExercise.id}`}>Sets</label>
            <input id={`sets-${workoutExercise.id}`} name="target_sets" type="number" min="0" defaultValue={workoutExercise.target_sets ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor={`reps-${workoutExercise.id}`}>Reps</label>
            <input id={`reps-${workoutExercise.id}`} name="target_reps" type="text" placeholder="6-8" defaultValue={workoutExercise.target_reps ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor={`rpe-${workoutExercise.id}`}>RPE</label>
            <input id={`rpe-${workoutExercise.id}`} name="target_rpe" type="number" min="0" max="10" step="0.5" defaultValue={workoutExercise.target_rpe ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor={`rest-${workoutExercise.id}`}>Rest (sec)</label>
            <input id={`rest-${workoutExercise.id}`} name="rest_seconds" type="number" min="0" defaultValue={workoutExercise.rest_seconds ?? ""} className="input" />
          </div>
        </div>
        <div className="mb-3">
          <label className="label" htmlFor={`notes-${workoutExercise.id}`}>Coach note</label>
          <input
            id={`notes-${workoutExercise.id}`}
            name="notes"
            type="text"
            defaultValue={workoutExercise.notes ?? ""}
            placeholder="Focus on slow eccentric. 3-second descent."
            className="input"
          />
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" className="btn btn-primary">Save</button>
          <button
            type="submit"
            formAction={removeWorkoutExercise}
            className="btn btn-ghost border-[rgba(239,68,68,0.4)] text-[var(--color-danger)]"
          >
            Remove
          </button>
        </div>
      </form>
    </details>
  );
}

function AddExerciseForm({
  programId,
  workoutId,
  library,
  nextOrderIndex
}: {
  programId: string;
  workoutId: string;
  library: Array<{ id: string; name: string; category: string | null }>;
  nextOrderIndex: number;
}) {
  if (library.length === 0) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5 text-sm">
        Your library is empty.{" "}
        <Link href="/app/library/new" className="text-[var(--color-blue-glow)] font-semibold">
          Add an exercise
        </Link>{" "}
        before you can put it in a workout.
      </div>
    );
  }
  return (
    <form action={addWorkoutExercise} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5">
      <input type="hidden" name="program_id" value={programId} />
      <input type="hidden" name="workout_id" value={workoutId} />
      <input type="hidden" name="order_index" value={nextOrderIndex} />
      <h3 className="font-bold mb-3">Add an exercise</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="md:col-span-2">
          <label className="label" htmlFor="exercise_id">Exercise</label>
          <select id="exercise_id" name="exercise_id" required className="input">
            {library.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}{e.category ? ` · ${e.category}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="target_sets">Sets</label>
          <input id="target_sets" name="target_sets" type="number" min="0" placeholder="3" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="target_reps">Reps</label>
          <input id="target_reps" name="target_reps" type="text" placeholder="6-8" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="target_rpe">RPE</label>
          <input id="target_rpe" name="target_rpe" type="number" min="0" max="10" step="0.5" placeholder="7" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="rest_seconds">Rest (sec)</label>
          <input id="rest_seconds" name="rest_seconds" type="number" min="0" placeholder="120" className="input" />
        </div>
      </div>
      <button type="submit" className="btn btn-primary">Add exercise</button>
    </form>
  );
}
