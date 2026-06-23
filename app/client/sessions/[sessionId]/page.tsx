import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ClientSessionDetailPage({
  params
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clientProfile } = await supabase
    .from("client_profile")
    .select("id")
    .eq("user_id", user!.id)
    .maybeSingle();
  if (!clientProfile) {
    notFound();
  }

  const { data: session } = await supabase
    .from("workout_session")
    .select(`
      id, performed_at, duration_minutes, overall_rpe, notes, workout_id,
      workout:workout_id(id, week_number, day_number, name, notes)
    `)
    .eq("id", sessionId)
    .eq("client_id", clientProfile.id)
    .maybeSingle();

  if (!session) {
    notFound();
  }

  const { data: logs } = await supabase
    .from("exercise_log")
    .select(`
      id, exercise_id, set_number, reps, weight_kg, rpe,
      exercise:exercise_id(id, name, default_unit)
    `)
    .eq("session_id", session.id)
    .order("exercise_id")
    .order("set_number");

  const byExercise = new Map<string, { name: string; unit: string; sets: Array<{ set: number; reps: number | null; weight: number | null; rpe: number | null }> }>();
  (logs ?? []).forEach((l) => {
    const ex = Array.isArray(l.exercise) ? l.exercise[0] : l.exercise;
    const key = l.exercise_id;
    const entry = byExercise.get(key) ?? {
      name: ex?.name ?? "Exercise",
      unit: ex?.default_unit ?? "kg",
      sets: []
    };
    entry.sets.push({
      set: l.set_number,
      reps: l.reps,
      weight: l.weight_kg,
      rpe: l.rpe
    });
    byExercise.set(key, entry);
  });

  const workout = Array.isArray(session.workout) ? session.workout[0] : session.workout;

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/client/sessions" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; All sessions
      </Link>

      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Session
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          {workout?.name || "Workout"}
        </h1>
        <div className="flex items-center gap-3 mt-2 text-sm text-[var(--color-muted)]">
          <span>{new Date(session.performed_at).toLocaleString()}</span>
          {session.duration_minutes ? (
            <>
              <span className="text-[var(--color-subtle)]">&middot;</span>
              <span>{session.duration_minutes} min</span>
            </>
          ) : null}
          {session.overall_rpe ? (
            <>
              <span className="text-[var(--color-subtle)]">&middot;</span>
              <span>Overall RPE {session.overall_rpe}</span>
            </>
          ) : null}
        </div>
      </header>

      {session.notes ? (
        <div className="mb-6 p-4 rounded-xl bg-[rgba(0,174,239,0.06)] border border-[rgba(0,174,239,0.2)] text-sm">
          <span className="font-bold text-[var(--color-blue-glow)]">Your note:</span> {session.notes}
        </div>
      ) : null}

      <section className="mb-8">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
          What you did
        </h2>
        {byExercise.size === 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)]">
            No sets logged for this session.
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from(byExercise.values()).map((ex, i) => (
              <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5">
                <div className="font-bold mb-3">{ex.name}</div>
                <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
                  <span>Set</span>
                  <span>Reps</span>
                  <span>Weight ({ex.unit})</span>
                  <span>RPE</span>
                </div>
                <div className="space-y-1">
                  {ex.sets.sort((a, b) => a.set - b.set).map((s) => (
                    <div key={s.set} className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 text-sm">
                      <span className="font-bold text-[var(--color-muted)] w-8 text-center">{s.set}</span>
                      <span>{s.reps ?? "—"}</span>
                      <span>{s.weight ?? "—"}</span>
                      <span>{s.rpe ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex gap-3">
        <Link href={`/client/log/${session.workout_id}?sessionId=${session.id}`} className="btn btn-ghost flex-1 text-center">
          Edit this session
        </Link>
        <Link href="/client/program" className="btn btn-primary flex-1 text-center">
          Back to program
        </Link>
      </div>
    </main>
  );
}
