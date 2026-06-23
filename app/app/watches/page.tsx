import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computeJaseWatches, formatPercent, type LifecycleStage } from "@/lib/jase-watches";
import { computeRiskScore, type RiskResult } from "@/lib/at-risk";
import { partitionUpcomingEvents, type LifecycleEventRow, type LifecycleEventType } from "@/lib/lifecycle-event";

const STAGE_BREAKDOWN: Array<{ key: LifecycleStage; label: string; tint: string }> = [
  { key: "onboarding", label: "Onboarding", tint: "rgb(107, 114, 128)" },
  { key: "kickoff", label: "Kickoff", tint: "rgb(168, 85, 247)" },
  { key: "momentum", label: "Momentum", tint: "rgb(0, 174, 239)" },
  { key: "celebration", label: "Celebration", tint: "rgb(34, 197, 94)" },
  { key: "challenge_upgrade", label: "Challenge upgrade", tint: "rgb(20, 184, 166)" },
  { key: "catchup_call", label: "Catchup call", tint: "rgb(245, 158, 11)" },
  { key: "retreat", label: "Retreat", tint: "rgb(99, 102, 241)" },
  { key: "renewed", label: "Renewed", tint: "rgb(0, 174, 239)" },
  { key: "offboarded", label: "Offboarded", tint: "rgb(239, 68, 68)" }
];

export default async function WatchesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const { data: clients } = await supabase
    .from("client_profile")
    .select("id, lifecycle_stage, last_checkin_at, user_profile:user_id(full_name)")
    .eq("workspace_id", workspace!.id);

  const watches = computeJaseWatches((clients ?? []) as { lifecycle_stage: LifecycleStage }[]);

  const stageCounts = new Map<LifecycleStage, number>();
  (clients ?? []).forEach((c) => {
    const s = c.lifecycle_stage as LifecycleStage;
    stageCounts.set(s, (stageCounts.get(s) ?? 0) + 1);
  });

  // Compute at-risk scores for every client.
  // Pull recent activity counts in one bulk query per signal.
  const clientIds = (clients ?? []).map((c) => c.id);
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: recentSessions }, { data: recentMessages }] = clientIds.length
    ? await Promise.all([
        supabase
          .from("workout_session")
          .select("client_id, performed_at")
          .in("client_id", clientIds)
          .gte("performed_at", sevenDaysAgo),
        supabase
          .from("message")
          .select("thread_id, created_at, sender, sender_user_id, thread:thread_id(client_id)")
          .gte("created_at", fourteenDaysAgo)
          .eq("sender", "client")
      ])
    : [{ data: [] as { client_id: string; performed_at: string }[] }, { data: [] as Array<{ thread: { client_id: string } | { client_id: string }[]; created_at: string }> }];

  const sessionsByClient = new Map<string, number>();
  (recentSessions ?? []).forEach((s) => {
    sessionsByClient.set(s.client_id, (sessionsByClient.get(s.client_id) ?? 0) + 1);
  });

  const lastClientMessageAt = new Map<string, string>();
  (recentMessages ?? []).forEach((m) => {
    const thread = Array.isArray(m.thread) ? m.thread[0] : m.thread;
    const cid = thread?.client_id;
    if (!cid) return;
    const existing = lastClientMessageAt.get(cid);
    if (!existing || existing < m.created_at) lastClientMessageAt.set(cid, m.created_at);
  });

  function daysAgo(iso: string | null | undefined): number {
    if (!iso) return 9999;
    return Math.floor((now - Date.parse(iso)) / (24 * 60 * 60 * 1000));
  }

  type RiskRow = {
    id: string;
    name: string;
    stage: LifecycleStage;
    risk: RiskResult;
  };

  const ranked: RiskRow[] = (clients ?? []).map((c) => {
    const profile = Array.isArray(c.user_profile) ? c.user_profile[0] : c.user_profile;
    const sessions7 = sessionsByClient.get(c.id) ?? 0;
    const lastMsg = lastClientMessageAt.get(c.id) ?? null;
    const risk = computeRiskScore({
      lifecycle_stage: c.lifecycle_stage as LifecycleStage,
      days_since_checkin: daysAgo(c.last_checkin_at),
      days_since_session: 0, // not used in this v1
      sessions_last_7d: sessions7,
      expected_weekly_sessions: 3,
      days_since_client_message: daysAgo(lastMsg)
    });
    return {
      id: c.id,
      name: profile?.full_name ?? "Unnamed",
      stage: c.lifecycle_stage as LifecycleStage,
      risk
    };
  });

  const atRisk = ranked
    .filter((r) => r.risk.level !== "low")
    .sort((a, b) => b.risk.score - a.risk.score)
    .slice(0, 12);

  // Pull upcoming lifecycle events for this workspace
  const { data: eventRows } = await supabase
    .from("lifecycle_event")
    .select("id, event_type, scheduled_for, status, client_id, client:client_id(user_profile:user_id(full_name))")
    .eq("workspace_id", workspace!.id)
    .eq("status", "scheduled")
    .gte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(20);

  type UpcomingRow = LifecycleEventRow & { client_id: string; clientName: string };
  const upcoming: UpcomingRow[] = (eventRows ?? []).map((e) => {
    const c = Array.isArray(e.client) ? e.client[0] : e.client;
    const profile = c ? (Array.isArray(c.user_profile) ? c.user_profile[0] : c.user_profile) : null;
    return {
      id: e.id,
      event_type: e.event_type as LifecycleEventType,
      scheduled_for: e.scheduled_for,
      status: e.status,
      client_id: e.client_id,
      clientName: profile?.full_name ?? "Unnamed"
    };
  });
  const partitioned = partitionUpcomingEvents(upcoming, new Date());

  return (
    <main className="px-10 py-10 max-w-6xl">
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          The 4 Jase Watches
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Business health</h1>
        <p className="text-[var(--color-muted)] mt-2">
          The four numbers that tell you if the business is working. Same metrics as the client-data dashboard.
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <WatchTile
          label="Churn rate"
          value={formatPercent(watches.churnRate)}
          sub={`${watches.churnedCount.toLocaleString()} cancelled of ${watches.total.toLocaleString()}`}
          tone={watches.churnRate > 30 ? "danger" : watches.churnRate > 15 ? "warn" : "neutral"}
        />
        <WatchTile
          label="Retention rate"
          value={formatPercent(watches.retentionRate)}
          sub={`${watches.retainedCount.toLocaleString()} retained of ${watches.total.toLocaleString()}`}
          tone={watches.retentionRate >= 70 ? "good" : "neutral"}
        />
        <WatchTile
          label="Renewal rate"
          value={formatPercent(watches.renewalRate)}
          sub={`${watches.renewedCount.toLocaleString()} renewed of ${watches.pastOnboardingCount.toLocaleString()} past onboarding`}
          tone={watches.renewalRate < 5 ? "danger" : watches.renewalRate < 15 ? "warn" : "good"}
        />
        <WatchTile
          label="Offboarding"
          value={watches.offboardingTotal.toLocaleString()}
          sub="Total lost clients"
          tone="neutral"
        />
      </section>

      {partitioned.today.length + partitioned.thisWeek.length > 0 ? (
        <section className="mb-10">
          <h2 className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-blue-glow)] font-bold mb-3">
            Upcoming intervention calls
          </h2>
          <div className="bg-[var(--color-surface)] border border-[rgba(0,174,239,0.3)] rounded-2xl overflow-hidden">
            {partitioned.today.length > 0 ? (
              <UpcomingGroup label="Today" rows={partitioned.today as Array<{ id: string; event_type: string; scheduled_for: string; clientName: string; client_id: string }>} />
            ) : null}
            {partitioned.thisWeek.length > 0 ? (
              <UpcomingGroup label="This week" rows={partitioned.thisWeek as Array<{ id: string; event_type: string; scheduled_for: string; clientName: string; client_id: string }>} />
            ) : null}
          </div>
        </section>
      ) : null}

      {atRisk.length > 0 ? (
        <section className="mb-10">
          <h2 className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-warn)] font-bold mb-3">
            Needs intervention ({atRisk.length})
          </h2>
          <div className="bg-[var(--color-surface)] border border-[rgba(245,158,11,0.3)] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">
                  <th className="text-left p-4">Client</th>
                  <th className="text-left p-4">Stage</th>
                  <th className="text-left p-4">Why</th>
                  <th className="text-right p-4">Risk</th>
                  <th className="text-right p-4"></th>
                </tr>
              </thead>
              <tbody>
                {atRisk.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`border-t border-[var(--color-line)] hover:bg-[rgba(255,255,255,0.02)] ${idx === 0 ? "" : ""}`}
                  >
                    <td className="p-4 font-semibold">{r.name}</td>
                    <td className="p-4 text-[var(--color-muted)] capitalize">{r.stage.replace("_", " ")}</td>
                    <td className="p-4 text-[var(--color-muted)] text-xs">
                      {r.risk.reasons.join(" · ")}
                    </td>
                    <td className="p-4 text-right">
                      <span
                        className="inline-block px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[1.5px] font-bold"
                        style={{
                          backgroundColor: r.risk.level === "high" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                          color: r.risk.level === "high" ? "var(--color-danger)" : "var(--color-warn)"
                        }}
                      >
                        {r.risk.level} · {r.risk.score}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/app/clients/${r.id}`} className="text-xs text-[var(--color-blue-glow)] font-semibold hover:underline">
                        Open &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 text-xs text-[var(--color-subtle)] bg-[rgba(245,158,11,0.04)] border-t border-[var(--color-line)]">
              These clients are headed for offboarded. Open the profile and either book a Catchup call or message them today. Move them to the <strong>Catchup call</strong> stage to track the intervention.
            </div>
          </div>
        </section>
      ) : null}

      <section className="mb-10">
        <h2 className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-3">
          Client journey
        </h2>
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
          {watches.total === 0 ? (
            <div className="text-sm text-[var(--color-muted)] text-center py-6">
              No clients yet. <Link href="/app/clients/new" className="text-[var(--color-blue-glow)] font-semibold">Invite your first one</Link>.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
              {STAGE_BREAKDOWN.map((stage) => {
                const count = stageCounts.get(stage.key) ?? 0;
                const pct = watches.total === 0 ? 0 : Math.round((count / watches.total) * 100);
                return (
                  <div
                    key={stage.key}
                    className="rounded-xl p-4 border"
                    style={{
                      backgroundColor: `${stage.tint}10`,
                      borderColor: `${stage.tint}30`
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-[1.5px] font-bold mb-2" style={{ color: stage.tint }}>
                      {stage.label}
                    </div>
                    <div className="text-2xl font-extrabold">{count}</div>
                    <div className="text-[10px] text-[var(--color-subtle)] mt-1">{pct}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
        <h2 className="text-sm font-bold mb-2">How clients move through stages</h2>
        <p className="text-sm text-[var(--color-muted)] mb-3">
          On each client&apos;s profile you can move them through: Onboarding &rarr; Kickoff &rarr; Momentum &rarr; Celebration / Challenge upgrade. If they slip, drop them into Catchup call or Retreat. If they leave, mark them Offboarded. If they re-sign, Renewed.
        </p>
        <Link href="/app/clients" className="text-sm text-[var(--color-blue-glow)] font-semibold">Manage clients &rarr;</Link>
      </section>
    </main>
  );
}

function WatchTile({
  label,
  value,
  sub,
  tone
}: {
  label: string;
  value: string;
  sub: string;
  tone: "good" | "warn" | "danger" | "neutral";
}) {
  const color =
    tone === "danger"
      ? "var(--color-danger)"
      : tone === "warn"
        ? "var(--color-warn)"
        : tone === "good"
          ? "var(--color-blue-glow)"
          : "var(--color-ink)";
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
      <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-3">
        {label}
      </div>
      <div className="text-4xl font-extrabold mb-2" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-[var(--color-muted)]">{sub}</div>
    </div>
  );
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  catchup_call: "Catchup call",
  retreat: "Retreat",
  kickoff_call: "Kickoff call",
  celebration_call: "Celebration call",
  strategy_call: "Strategy call"
};

function UpcomingGroup({
  label,
  rows
}: {
  label: string;
  rows: Array<{ id: string; event_type: string; scheduled_for: string; clientName: string; client_id: string }>;
}) {
  return (
    <div className="border-b border-[var(--color-line)] last:border-0">
      <div className="px-5 py-3 text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold bg-[rgba(0,0,0,0.2)]">
        {label}
      </div>
      <div>
        {rows.map((r) => (
          <Link
            key={r.id}
            href={`/app/clients/${r.client_id}`}
            className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-[rgba(255,255,255,0.02)] border-t border-[var(--color-line)] first:border-0"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="text-[10px] uppercase tracking-[1.5px] font-bold text-[var(--color-blue-glow)] shrink-0">
                {EVENT_TYPE_LABELS[r.event_type] ?? r.event_type}
              </span>
              <span className="font-semibold truncate">{r.clientName}</span>
            </div>
            <span className="text-xs text-[var(--color-muted)] shrink-0">
              {new Date(r.scheduled_for).toLocaleString()}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
