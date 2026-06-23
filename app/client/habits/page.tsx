import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { toggleHabitToday } from "./actions";

export default async function ClientHabitsPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const sp = await searchParams;

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

  const today = new Date().toISOString().slice(0, 10);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ data: assignments }, { data: logs }] = await Promise.all([
    supabase
      .from("habit_assignment")
      .select("id, frequency, target_value, target_unit, habit:habit_id(id, name, description, category)")
      .eq("client_id", clientProfile.id)
      .eq("status", "active")
      .order("assigned_at", { ascending: true }),
    supabase
      .from("habit_log")
      .select("assignment_id, log_date, completed")
      .eq("client_id", clientProfile.id)
      .gte("log_date", since7d)
  ]);

  const logMap = new Map<string, { completed: boolean }>();
  (logs ?? []).forEach((l) => {
    logMap.set(`${l.assignment_id}:${l.log_date}`, { completed: l.completed });
  });

  // Past 7 days
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push(new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/client" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Home
      </Link>
      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Daily habits
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Today</h1>
        <p className="text-[var(--color-muted)] mt-2">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </header>

      {sp.saved === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Updated.</div>
      ) : null}

      {(!assignments || assignments.length === 0) ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-10 text-center">
          <h2 className="text-lg font-bold mb-2">No habits yet</h2>
          <p className="text-[var(--color-muted)] text-sm">
            Your coach hasn&rsquo;t assigned daily habits. Check back later.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const h = Array.isArray(a.habit) ? a.habit[0] : a.habit;
            const todayLog = logMap.get(`${a.id}:${today}`);
            const isDone = todayLog?.completed ?? false;
            return (
              <div key={a.id} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <form action={toggleHabitToday}>
                    <input type="hidden" name="assignment_id" value={a.id} />
                    <input type="hidden" name="completed" value={isDone ? "0" : "1"} />
                    <button
                      type="submit"
                      className={`w-11 h-11 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isDone
                          ? "bg-[var(--color-ok)] border-[var(--color-ok)] text-black"
                          : "border-[var(--color-line-strong)] text-[var(--color-subtle)] hover:border-[var(--color-blue)] hover:text-[var(--color-blue)]"
                      }`}
                      aria-label={isDone ? "Mark not done" : "Mark done"}
                    >
                      {isDone ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : null}
                    </button>
                  </form>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-base">{h?.name}</div>
                    {h?.description ? (
                      <div className="text-sm text-[var(--color-muted)] mt-1">{h.description}</div>
                    ) : null}
                    <div className="text-xs text-[var(--color-subtle)] mt-2 flex items-center gap-3">
                      <span className="capitalize">{a.frequency}</span>
                      {a.target_value && a.target_unit ? (
                        <>
                          <span>·</span>
                          <span>{a.target_value} {a.target_unit}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[var(--color-line)] flex items-center gap-1.5">
                  {days.map((d) => {
                    const log = logMap.get(`${a.id}:${d}`);
                    const done = log?.completed ?? false;
                    const isToday = d === today;
                    return (
                      <div
                        key={d}
                        className={`flex-1 h-7 rounded ${done ? "bg-[var(--color-ok)]" : "bg-[rgba(255,255,255,0.06)]"} ${isToday ? "ring-2 ring-[var(--color-blue)]" : ""}`}
                        title={d}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-2 text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">
                  <span>7 days ago</span>
                  <span>Today</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
