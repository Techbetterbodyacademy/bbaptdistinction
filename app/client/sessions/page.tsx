import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ClientSessionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clientProfile } = await supabase
    .from("client_profile")
    .select("id")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!clientProfile) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-[var(--color-muted)]">Profile not found.</p>
      </main>
    );
  }

  const { data: sessions } = await supabase
    .from("workout_session")
    .select(`
      id, performed_at, duration_minutes, overall_rpe, notes,
      workout:workout_id(id, week_number, day_number, name)
    `)
    .eq("client_id", clientProfile.id)
    .order("performed_at", { ascending: false })
    .limit(50);

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/client" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Home
      </Link>

      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Workout history
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Your sessions</h1>
        <p className="text-[var(--color-muted)] mt-2">
          {sessions?.length ?? 0} logged
        </p>
      </header>

      {(!sessions || sessions.length === 0) ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-10 text-center">
          <h2 className="text-lg font-bold mb-2">No sessions yet</h2>
          <p className="text-[var(--color-muted)] text-sm mb-5">
            Log a workout from your program and it&rsquo;ll show up here.
          </p>
          <Link href="/client/program" className="btn btn-primary">Open your program</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const workout = Array.isArray(s.workout) ? s.workout[0] : s.workout;
            return (
              <Link
                key={s.id}
                href={`/client/sessions/${s.id}`}
                className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-blue)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">
                    {workout?.name || (workout ? `Week ${workout.week_number} · Day ${workout.day_number}` : "Session")}
                  </div>
                  <div className="text-xs text-[var(--color-muted)] mt-0.5">
                    {new Date(s.performed_at).toLocaleString()}
                    {s.duration_minutes ? ` · ${s.duration_minutes} min` : ""}
                    {s.overall_rpe ? ` · RPE ${s.overall_rpe}` : ""}
                  </div>
                </div>
                <span className="text-[var(--color-subtle)] text-lg">&rsaquo;</span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
