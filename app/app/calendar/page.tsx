import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function CalendarPage({
  searchParams
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const weekOffset = Number(params.week ?? "0") || 0;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  // Get clients in workspace first
  const { data: clientIds } = await supabase
    .from("client_profile")
    .select("id")
    .eq("workspace_id", workspace!.id);
  const ids = (clientIds ?? []).map((c) => c.id);

  // Compute week boundaries (Mon-Sun, fixed timezone-agnostic)
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000 + weekOffset * 7 * 24 * 60 * 60 * 1000);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: sessions } = ids.length > 0
    ? await supabase
        .from("workout_session")
        .select("id, performed_at, client_id, workout:workout_id(name, week_number, day_number), client:client_id(user_profile:user_id(full_name))")
        .in("client_id", ids)
        .gte("performed_at", monday.toISOString())
        .lt("performed_at", sunday.toISOString())
        .order("performed_at", { ascending: true })
    : { data: [] };

  const days: Array<{ date: Date; label: string }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getTime() + i * 24 * 60 * 60 * 1000);
    days.push({
      date: d,
      label: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    });
  }

  const sessionsByDay = new Map<string, Array<{ id: string; client_id: string; performed_at: string; client_name: string; workout_name: string }>>();
  (sessions ?? []).forEach((s) => {
    const day = new Date(s.performed_at).toDateString();
    const w = Array.isArray(s.workout) ? s.workout[0] : s.workout;
    const c = Array.isArray(s.client) ? s.client[0] : s.client;
    const profile = c ? (Array.isArray(c.user_profile) ? c.user_profile[0] : c.user_profile) : null;
    const arr = sessionsByDay.get(day) ?? [];
    arr.push({
      id: s.id,
      client_id: s.client_id,
      performed_at: s.performed_at,
      client_name: profile?.full_name ?? "Client",
      workout_name: w?.name || (w ? `W${w.week_number}D${w.day_number}` : "Session")
    });
    sessionsByDay.set(day, arr);
  });

  return (
    <main className="px-10 py-10 max-w-6xl">
      <header className="flex items-start justify-between mb-8 gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
            Calendar
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {weekOffset === 0 ? "This week" : weekOffset < 0 ? `${Math.abs(weekOffset)} week${Math.abs(weekOffset) === 1 ? "" : "s"} ago` : `${weekOffset} week${weekOffset === 1 ? "" : "s"} ahead`}
          </h1>
          <p className="text-[var(--color-muted)] mt-2">
            {monday.toLocaleDateString()} — {new Date(sunday.getTime() - 1).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/app/calendar?week=${weekOffset - 1}`} className="btn btn-ghost">&larr; Prev</Link>
          {weekOffset !== 0 ? (
            <Link href="/app/calendar" className="btn btn-ghost">Today</Link>
          ) : null}
          <Link href={`/app/calendar?week=${weekOffset + 1}`} className="btn btn-ghost">Next &rarr;</Link>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {days.map((d) => {
          const sessionsForDay = sessionsByDay.get(d.date.toDateString()) ?? [];
          const isToday = d.date.toDateString() === new Date().toDateString();
          return (
            <div
              key={d.label}
              className={`bg-[var(--color-surface)] border rounded-xl p-3 min-h-[180px] ${isToday ? "border-[var(--color-blue)]" : "border-[var(--color-line)]"}`}
            >
              <div className={`text-[10px] uppercase tracking-[1.5px] font-bold mb-2 ${isToday ? "text-[var(--color-blue-glow)]" : "text-[var(--color-subtle)]"}`}>
                {d.label}
              </div>
              {sessionsForDay.length === 0 ? (
                <div className="text-xs text-[var(--color-subtle)] italic">—</div>
              ) : (
                <div className="space-y-1.5">
                  {sessionsForDay.map((s) => (
                    <Link
                      key={s.id}
                      href={`/app/clients/${s.client_id}/sessions/${s.id}`}
                      className="block p-2 rounded-lg bg-[rgba(0,174,239,0.08)] border border-[rgba(0,174,239,0.2)] hover:border-[var(--color-blue)] transition-colors"
                    >
                      <div className="text-[10px] text-[var(--color-blue-glow)] font-bold">
                        {new Date(s.performed_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </div>
                      <div className="text-xs font-semibold truncate">{s.client_name}</div>
                      <div className="text-[10px] text-[var(--color-muted)] truncate">{s.workout_name}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
