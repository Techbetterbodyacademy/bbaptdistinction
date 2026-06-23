import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id, name, coach_name")
    .eq("owner_id", user!.id)
    .single();

  if (!workspace) return null;

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: clientIds } = await supabase
    .from("client_profile")
    .select("id")
    .eq("workspace_id", workspace.id);
  const ids = (clientIds ?? []).map((c) => c.id);

  const [
    activeClients,
    pendingInvites,
    publishedPrograms,
    pendingCheckins,
    weeklySessions,
    recentSessions,
    recentCheckins,
    recentTransformations
  ] = await Promise.all([
    supabase.from("client_profile").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id).eq("status", "active"),
    supabase.from("client_invite").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id).eq("status", "pending"),
    supabase.from("program").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id).eq("status", "published"),
    ids.length > 0
      ? supabase.from("check_in").select("id", { count: "exact", head: true }).in("client_id", ids).is("coach_response", null)
      : Promise.resolve({ count: 0 } as { count: number }),
    ids.length > 0
      ? supabase.from("workout_session").select("id", { count: "exact", head: true }).in("client_id", ids).gte("performed_at", since7d)
      : Promise.resolve({ count: 0 } as { count: number }),
    ids.length > 0
      ? supabase
          .from("workout_session")
          .select("id, performed_at, client_id, workout:workout_id(name, week_number, day_number), client:client_id(user_profile:user_id(full_name))")
          .in("client_id", ids)
          .order("performed_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    ids.length > 0
      ? supabase
          .from("check_in")
          .select("id, submitted_at, week_number, wins, coach_response, client:client_id(id, user_profile:user_id(full_name))")
          .in("client_id", ids)
          .gte("submitted_at", since7d)
          .order("submitted_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    ids.length > 0
      ? supabase
          .from("transformation_entry")
          .select("id, entry_date, weight_kg, client_id, client:client_id(id, user_profile:user_id(full_name))")
          .in("client_id", ids)
          .gte("created_at", since7d)
          .order("entry_date", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] })
  ]);

  const cActive = (activeClients as unknown as { count?: number })?.count ?? 0;
  const cInvites = (pendingInvites as unknown as { count?: number })?.count ?? 0;
  const cPrograms = (publishedPrograms as unknown as { count?: number })?.count ?? 0;
  const cPendingReplies = (pendingCheckins as unknown as { count?: number })?.count ?? 0;
  const cWeeklySessions = (weeklySessions as unknown as { count?: number })?.count ?? 0;

  return (
    <main className="px-10 py-10 max-w-6xl">
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Dashboard
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Welcome back, <span className="text-[var(--color-blue-glow)]">{workspace.coach_name?.split(" ")[0] ?? "Coach"}</span>.
        </h1>
        <p className="text-[var(--color-muted)] mt-2">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <StatCard label="Active clients" value={cActive} href="/app/clients" />
        <StatCard label="Pending invites" value={cInvites} href="/app/clients" accent={cInvites > 0 ? "warn" : undefined} />
        <StatCard label="Replies needed" value={cPendingReplies} href="/app/checkins" accent={cPendingReplies > 0 ? "danger" : undefined} />
        <StatCard label="Sessions this week" value={cWeeklySessions} href="/app/clients" />
        <StatCard label="Published programs" value={cPrograms} href="/app/programs" />
      </section>

      {cPendingReplies > 0 || cInvites > 0 ? (
        <section className="bg-[var(--color-surface)] border border-[var(--color-blue)] rounded-2xl p-6 mb-8">
          <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-blue-glow)] mb-3">
            Needs your attention
          </h2>
          <div className="space-y-2">
            {cPendingReplies > 0 ? (
              <Link href="/app/checkins" className="flex items-center justify-between p-3 rounded-xl bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.2)] hover:border-[var(--color-danger)] transition-colors">
                <span className="font-semibold">{cPendingReplies} check-in{cPendingReplies === 1 ? "" : "s"} awaiting your reply</span>
                <span className="text-[var(--color-danger)]">→</span>
              </Link>
            ) : null}
            {cInvites > 0 ? (
              <Link href="/app/clients" className="flex items-center justify-between p-3 rounded-xl bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.2)] hover:border-[var(--color-warn)] transition-colors">
                <span className="font-semibold">{cInvites} pending invite{cInvites === 1 ? "" : "s"} — copy their share link</span>
                <span className="text-[var(--color-warn)]">→</span>
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <FeedColumn
          title="Recent sessions"
          empty="No workouts logged in the last 7 days."
          items={(recentSessions.data ?? []).map((s) => {
            const w = Array.isArray(s.workout) ? s.workout[0] : s.workout;
            const c = Array.isArray(s.client) ? s.client[0] : s.client;
            const profile = c ? (Array.isArray(c.user_profile) ? c.user_profile[0] : c.user_profile) : null;
            return {
              key: s.id,
              href: `/app/clients/${s.client_id}/sessions/${s.id}`,
              primary: profile?.full_name ?? "Client",
              secondary: w?.name || (w ? `Week ${w.week_number} · Day ${w.day_number}` : "Session"),
              meta: new Date(s.performed_at).toLocaleString()
            };
          })}
        />
        <FeedColumn
          title="Recent check-ins"
          empty="No check-ins in the last 7 days."
          items={(recentCheckins.data ?? []).map((c) => {
            const cl = Array.isArray(c.client) ? c.client[0] : c.client;
            const profile = cl ? (Array.isArray(cl.user_profile) ? cl.user_profile[0] : cl.user_profile) : null;
            return {
              key: c.id,
              href: `/app/checkins/${c.id}`,
              primary: profile?.full_name ?? "Client",
              secondary: `Week ${c.week_number ?? "—"} · ${c.coach_response ? "replied" : "needs reply"}`,
              meta: new Date(c.submitted_at).toLocaleDateString()
            };
          })}
        />
        <FeedColumn
          title="Recent logbook"
          empty="No new logbook entries this week."
          items={(recentTransformations.data ?? []).map((t) => {
            const cl = Array.isArray(t.client) ? t.client[0] : t.client;
            const profile = cl ? (Array.isArray(cl.user_profile) ? cl.user_profile[0] : cl.user_profile) : null;
            return {
              key: t.id,
              href: `/app/clients/${t.client_id}?tab=logbook`,
              primary: profile?.full_name ?? "Client",
              secondary: t.weight_kg ? `${t.weight_kg} kg logged` : "Measurements logged",
              meta: new Date(t.entry_date).toLocaleDateString()
            };
          })}
        />
      </section>

      {cActive === 0 && cInvites === 0 ? (
        <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Bring on your first client</h2>
          <p className="text-[var(--color-muted)] text-sm mb-5 max-w-md mx-auto">
            Send them an invite or copy a share link. They fill the Real Reasons intake. You assign a program. The system runs from there.
          </p>
          <Link href="/app/clients/new" className="btn btn-primary">Add your first client</Link>
        </section>
      ) : null}
    </main>
  );
}

function StatCard({
  label,
  value,
  href,
  accent
}: {
  label: string;
  value: number;
  href: string;
  accent?: "warn" | "danger";
}) {
  const color = accent === "danger" ? "var(--color-danger)" : accent === "warn" ? "var(--color-warn)" : "var(--color-ink)";
  return (
    <Link
      href={href}
      className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5 hover:border-[var(--color-blue)] transition-colors block"
    >
      <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
        {label}
      </div>
      <div className="text-3xl font-extrabold" style={{ color }}>{value}</div>
    </Link>
  );
}

function FeedColumn({
  title,
  empty,
  items
}: {
  title: string;
  empty: string;
  items: Array<{ key: string; href: string; primary: string; secondary: string; meta: string }>;
}) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5">
      <h2 className="text-[11px] uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.key}>
              <Link
                href={it.href}
                className="block p-3 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors"
              >
                <div className="font-semibold text-sm truncate">{it.primary}</div>
                <div className="text-xs text-[var(--color-muted)] truncate mt-0.5">{it.secondary}</div>
                <div className="text-[10px] text-[var(--color-subtle)] mt-1">{it.meta}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
