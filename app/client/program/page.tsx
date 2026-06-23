import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ClientProgramPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clientProfile } = await supabase
    .from("client_profile")
    .select("id, workspace_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!clientProfile) {
    return <NoProgramView />;
  }

  const { data: assignment } = await supabase
    .from("program_assignment")
    .select(`
      id, start_date, status,
      program:program_id(id, name, description, weeks, status, version)
    `)
    .eq("client_id", clientProfile.id)
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const program = Array.isArray(assignment?.program) ? assignment?.program[0] : assignment?.program;

  if (!assignment || !program) {
    return <NoProgramView />;
  }

  const { data: workouts } = await supabase
    .from("workout")
    .select(`
      id, week_number, day_number, name, notes,
      workout_exercise(id, order_index, target_sets, target_reps, target_rpe, rest_seconds, notes,
        exercise:exercise_id(id, name, category, video_url, default_unit))
    `)
    .eq("program_id", program.id)
    .order("week_number")
    .order("day_number");

  const workoutsByWeek = new Map<number, typeof workouts>();
  (workouts ?? []).forEach((w) => {
    const arr = workoutsByWeek.get(w.week_number) ?? [];
    arr.push(w);
    workoutsByWeek.set(w.week_number, arr);
  });

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/client" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Home
      </Link>

      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Your program
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">{program.name}</h1>
        {program.description ? (
          <p className="text-[var(--color-muted)] mt-2">{program.description}</p>
        ) : null}
        <div className="flex items-center gap-3 mt-3 text-sm text-[var(--color-muted)]">
          <span>{program.weeks} weeks</span>
          <span className="text-[var(--color-subtle)]">&middot;</span>
          <span>Started {new Date(assignment.start_date).toLocaleDateString()}</span>
        </div>
      </header>

      {Array.from(workoutsByWeek.keys()).sort((a, b) => a - b).map((week) => (
        <section key={week} className="mb-8">
          <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
            Week {week}
          </h2>
          <div className="space-y-2">
            {(workoutsByWeek.get(week) ?? []).map((w) => (
              <ClientWorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        </section>
      ))}

      {(!workouts || workouts.length === 0) ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-8 text-sm text-[var(--color-muted)]">
          Your coach hasn&rsquo;t added workouts yet. They&rsquo;ll appear here as soon as they do.
        </div>
      ) : null}
    </main>
  );
}

function ClientWorkoutCard({
  workout
}: {
  workout: {
    id: string;
    day_number: number;
    name: string | null;
    notes: string | null;
    workout_exercise: Array<{
      id: string;
      order_index: number;
      target_sets: number | null;
      target_reps: string | null;
      target_rpe: number | null;
      rest_seconds: number | null;
      notes: string | null;
      exercise: { id: string; name: string; category: string | null; video_url: string | null; default_unit: string | null } | Array<{ id: string; name: string; category: string | null; video_url: string | null; default_unit: string | null }> | null;
    }>;
  };
}) {
  const exercises = (workout.workout_exercise ?? []).sort((a, b) => a.order_index - b.order_index);

  return (
    <details className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl overflow-hidden">
      <summary className="flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-[rgba(255,255,255,0.02)]">
        <div>
          <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">
            Day {workout.day_number}
          </div>
          <div className="font-semibold text-sm mt-0.5">{workout.name || "Untitled"}</div>
        </div>
        <div className="text-xs text-[var(--color-muted)]">
          {exercises.length} {exercises.length === 1 ? "exercise" : "exercises"}
        </div>
      </summary>
      <div className="border-t border-[var(--color-line)] p-5 bg-[var(--color-bg-deep)]">
        {workout.notes ? (
          <div className="mb-4 p-3 rounded-lg bg-[rgba(0,174,239,0.06)] border border-[rgba(0,174,239,0.2)] text-sm">
            <span className="font-bold text-[var(--color-blue-glow)]">Coach note:</span> {workout.notes}
          </div>
        ) : null}
        <Link
          href={`/client/log/${workout.id}`}
          className="btn btn-primary w-full mb-4 text-center"
        >
          Log this workout
        </Link>
        {exercises.length === 0 ? (
          <div className="text-sm text-[var(--color-muted)]">No exercises yet.</div>
        ) : (
          <ol className="space-y-3">
            {exercises.map((we, i) => {
              const ex = Array.isArray(we.exercise) ? we.exercise[0] : we.exercise;
              return (
                <li key={we.id} className="flex gap-3">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-[rgba(0,174,239,0.15)] text-[var(--color-blue-glow)] font-extrabold text-xs flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold">{ex?.name ?? "Exercise"}</span>
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
                    <div className="text-xs text-[var(--color-muted)] mt-0.5">
                      {we.target_sets ?? "—"} sets
                      {we.target_reps ? ` × ${we.target_reps}` : ""}
                      {we.target_rpe ? ` @ RPE ${we.target_rpe}` : ""}
                      {we.rest_seconds ? ` · ${we.rest_seconds}s rest` : ""}
                    </div>
                    {we.notes ? (
                      <div className="text-xs text-[var(--color-muted)] mt-1 italic">{we.notes}</div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </details>
  );
}

function NoProgramView() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <Link href="/client" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Home
      </Link>
      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-10 mt-6 text-center">
        <h1 className="text-2xl font-bold mb-2">No active program yet</h1>
        <p className="text-[var(--color-muted)]">
          Your coach is building yours. You&rsquo;ll see it here as soon as it&rsquo;s assigned.
        </p>
      </div>
    </main>
  );
}
