import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startOrResumeSession, logSession } from "./actions";

const MAX_SETS_INPUT = 8;

export default async function WorkoutLoggerPage({
  params,
  searchParams
}: {
  params: Promise<{ workoutId: string }>;
  searchParams: Promise<{ sessionId?: string; error?: string }>;
}) {
  const { workoutId } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clientProfile } = await supabase
    .from("client_profile")
    .select("id, workspace_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!clientProfile) {
    redirect("/client");
  }

  const { data: workout } = await supabase
    .from("workout")
    .select(`
      id, week_number, day_number, name, notes, program_id,
      workout_exercise(id, exercise_id, order_index, target_sets, target_reps, target_rpe, rest_seconds, notes,
        exercise:exercise_id(id, name, default_unit, video_url))
    `)
    .eq("id", workoutId)
    .maybeSingle();

  if (!workout) {
    notFound();
  }

  const exercises = (workout.workout_exercise ?? []).slice().sort((a, b) => a.order_index - b.order_index);

  let sessionId = sp.sessionId;
  if (!sessionId) {
    const { data: existing } = await supabase
      .from("workout_session")
      .select("id")
      .eq("client_id", clientProfile.id)
      .eq("workout_id", workoutId)
      .gte("performed_at", new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString())
      .order("performed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    sessionId = existing?.id;
  }

  const { data: existingLogs } = sessionId
    ? await supabase
        .from("exercise_log")
        .select("id, exercise_id, set_number, reps, weight_kg, rpe")
        .eq("session_id", sessionId)
    : { data: null };

  const logByKey = new Map<string, { reps: number | null; weight_kg: number | null; rpe: number | null }>();
  (existingLogs ?? []).forEach((log) => {
    logByKey.set(`${log.exercise_id}:${log.set_number}`, {
      reps: log.reps,
      weight_kg: log.weight_kg,
      rpe: log.rpe
    });
  });

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/client/program" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Back to program
      </Link>

      <header className="mt-4 mb-6">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Week {workout.week_number} · Day {workout.day_number}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {workout.name || "Workout"}
        </h1>
        {workout.notes ? (
          <div className="mt-3 p-3 rounded-lg bg-[rgba(0,174,239,0.06)] border border-[rgba(0,174,239,0.2)] text-sm">
            <span className="font-bold text-[var(--color-blue-glow)]">Coach note:</span> {workout.notes}
          </div>
        ) : null}
      </header>

      {!sessionId ? (
        <form action={startOrResumeSession} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 text-center">
          <input type="hidden" name="workout_id" value={workout.id} />
          <h2 className="text-lg font-bold mb-2">Ready to start?</h2>
          <p className="text-sm text-[var(--color-muted)] mb-5">
            Hit start, log your sets as you go, hit finish when you&rsquo;re done.
          </p>
          <button type="submit" className="btn btn-primary w-full">Start workout</button>
        </form>
      ) : (
        <form action={logSession} className="space-y-5">
          <input type="hidden" name="session_id" value={sessionId} />
          <input type="hidden" name="workout_id" value={workout.id} />

          {exercises.length === 0 ? (
            <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 text-sm text-[var(--color-muted)]">
              No exercises planned for this workout yet.
            </div>
          ) : (
            exercises.map((we, i) => {
              const ex = Array.isArray(we.exercise) ? we.exercise[0] : we.exercise;
              const plannedSets = Math.min(we.target_sets ?? 3, MAX_SETS_INPUT);
              return (
                <section
                  key={we.id}
                  className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5"
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[var(--color-blue-glow)] font-extrabold text-sm">#{i + 1}</span>
                      <h3 className="font-bold">{ex?.name ?? "Exercise"}</h3>
                    </div>
                    {ex?.video_url ? (
                      <a
                        href={ex.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--color-blue-glow)] hover:underline"
                      >
                        Watch
                      </a>
                    ) : null}
                  </div>
                  <div className="text-xs text-[var(--color-muted)] mb-4">
                    Target: {we.target_sets ?? "—"} sets
                    {we.target_reps ? ` × ${we.target_reps}` : ""}
                    {we.target_rpe ? ` @ RPE ${we.target_rpe}` : ""}
                    {we.rest_seconds ? ` · ${we.rest_seconds}s rest` : ""}
                  </div>

                  <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-1">
                    <span>Set</span>
                    <span>Reps</span>
                    <span>Weight ({ex?.default_unit ?? "kg"})</span>
                    <span>RPE</span>
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: plannedSets }, (_, s) => {
                      const setNum = s + 1;
                      const prev = logByKey.get(`${we.exercise_id}:${setNum}`);
                      return (
                        <div key={setNum} className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 items-center">
                          <span className="text-center w-8 text-sm font-bold text-[var(--color-muted)]">{setNum}</span>
                          <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            name={`reps__${we.exercise_id}__${setNum}`}
                            defaultValue={prev?.reps ?? ""}
                            placeholder={we.target_reps ?? ""}
                            className="input text-base"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            inputMode="decimal"
                            name={`weight__${we.exercise_id}__${setNum}`}
                            defaultValue={prev?.weight_kg ?? ""}
                            className="input text-base"
                          />
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.5"
                            inputMode="decimal"
                            name={`rpe__${we.exercise_id}__${setNum}`}
                            defaultValue={prev?.rpe ?? ""}
                            placeholder={we.target_rpe ? String(we.target_rpe) : ""}
                            className="input text-base"
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}

          <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5">
            <h3 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
              Wrap up
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="label" htmlFor="duration_minutes">Duration (min)</label>
                <input
                  id="duration_minutes"
                  name="duration_minutes"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="overall_rpe">Overall RPE</label>
                <input
                  id="overall_rpe"
                  name="overall_rpe"
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  inputMode="decimal"
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="notes">How did it feel?</label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Felt great. Hit a PR on squats. Tight hamstrings on deadlifts."
                className="input resize-y"
              />
            </div>
          </section>

          {sp.error ? (
            <div className="text-sm text-[var(--color-danger)] text-center">
              Could not save. Try again.
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <button type="submit" name="finish" value="0" className="btn btn-ghost w-full">
              Save progress
            </button>
            <button type="submit" name="finish" value="1" className="btn btn-primary w-full">
              Finish workout
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
