import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CoachSessionDetailPage({
  params
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id: clientId, sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const { data: client } = await supabase
    .from("client_profile")
    .select("id, user_profile:user_id(full_name)")
    .eq("id", clientId)
    .eq("workspace_id", workspace!.id)
    .maybeSingle();

  if (!client) {
    notFound();
  }

  const { data: session } = await supabase
    .from("workout_session")
    .select(`
      id, performed_at, duration_minutes, overall_rpe, notes,
      workout:workout_id(id, week_number, day_number, name,
        program:program_id(id, name))
    `)
    .eq("id", sessionId)
    .eq("client_id", client.id)
    .maybeSingle();

  if (!session) {
    notFound();
  }

  const { data: logs } = await supabase
    .from("exercise_log")
    .select(`
      id, exercise_id, set_number, reps, weight_kg, rpe, notes,
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

  const profile = Array.isArray(client.user_profile) ? client.user_profile[0] : client.user_profile;
  const workout = Array.isArray(session.workout) ? session.workout[0] : session.workout;
  const program = workout ? (Array.isArray(workout.program) ? workout.program[0] : workout.program) : null;

  return (
    <main className="px-10 py-10 max-w-4xl">
      <Link href={`/app/clients/${clientId}`} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Back to {profile?.full_name ?? "client"}
      </Link>

      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          {program?.name ?? "Session"}
          {workout ? ` · Week ${workout.week_number} · Day ${workout.day_number}` : ""}
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          {workout?.name || "Workout session"}
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
          <span className="font-bold text-[var(--color-blue-glow)]">Client&rsquo;s note:</span> {session.notes}
        </div>
      ) : null}

      <section>
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
          What they did
        </h2>
        {byExercise.size === 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)]">
            No sets logged for this session.
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from(byExercise.values()).map((ex, i) => {
              const totalVolume = ex.sets.reduce((acc, s) => acc + (s.reps ?? 0) * (s.weight ?? 0), 0);
              return (
                <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5">
                  <div className="flex items-baseline justify-between mb-3">
                    <div className="font-bold">{ex.name}</div>
                    {totalVolume > 0 ? (
                      <div className="text-xs text-[var(--color-muted)]">
                        Volume: <span className="text-[var(--color-blue-glow)] font-semibold">{totalVolume.toFixed(0)} {ex.unit}</span>
                      </div>
                    ) : null}
                  </div>
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
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
