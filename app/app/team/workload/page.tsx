import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computeCoachWorkload, type CoachAssignment } from "@/lib/coach-workload";
import { computeRiskScore } from "@/lib/at-risk";
import type { LifecycleStage } from "@/lib/jase-watches";

export default async function WorkloadPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id, coach_name")
    .eq("owner_id", user!.id)
    .single();

  const [{ data: trainers }, { data: clients }] = await Promise.all([
    supabase
      .from("workspace_trainer")
      .select("user_id, invite_email, full_name, status")
      .eq("workspace_id", workspace!.id)
      .eq("status", "accepted"),
    supabase
      .from("client_profile")
      .select("id, coach_id, lifecycle_stage, last_checkin_at")
      .eq("workspace_id", workspace!.id)
  ]);

  // Build the coach list: owner + accepted trainers
  const coachList = [
    { user_id: user!.id, name: workspace?.coach_name ?? user!.email ?? "Owner" },
    ...((trainers ?? [])
      .filter((t) => t.user_id)
      .map((t) => ({ user_id: t.user_id as string, name: t.full_name ?? t.invite_email ?? "Trainer" })))
  ];

  const clientIds = (clients ?? []).map((c) => c.id);
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentSessions } = clientIds.length
    ? await supabase
        .from("workout_session")
        .select("client_id")
        .in("client_id", clientIds)
        .gte("performed_at", sevenDaysAgo)
    : { data: [] };

  const sessionsByClient = new Map<string, number>();
  (recentSessions ?? []).forEach((s) => {
    sessionsByClient.set(s.client_id, (sessionsByClient.get(s.client_id) ?? 0) + 1);
  });

  function daysAgo(iso: string | null | undefined): number {
    if (!iso) return 9999;
    return Math.floor((now - Date.parse(iso)) / (24 * 60 * 60 * 1000));
  }

  const assignments: CoachAssignment[] = (clients ?? []).map((c) => {
    const risk = computeRiskScore({
      lifecycle_stage: c.lifecycle_stage as LifecycleStage,
      days_since_checkin: daysAgo(c.last_checkin_at),
      days_since_session: 0,
      sessions_last_7d: sessionsByClient.get(c.id) ?? 0,
      expected_weekly_sessions: 3,
      days_since_client_message: 9999
    });
    return {
      coach_id: c.coach_id ?? null,
      lifecycle_stage: c.lifecycle_stage as LifecycleStage,
      risk_level: risk.level
    };
  });

  const rows = computeCoachWorkload(coachList, assignments);

  const grandTotal = rows.reduce((acc, r) => acc + r.total, 0);
  const grandActive = rows.reduce((acc, r) => acc + r.active, 0);
  const grandAtRisk = rows.reduce((acc, r) => acc + r.atRiskTotal, 0);

  return (
    <main className="px-10 py-10 max-w-5xl">
      <header className="mb-8">
        <Link href="/app/team" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
          &larr; Team access
        </Link>
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mt-4 mb-2">
          Coach workload
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Who is carrying what</h1>
        <p className="text-[var(--color-muted)] mt-2">
          Each coach&apos;s active client count and at-risk count. Reassign clients on their profile page if loads are uneven.
        </p>
      </header>

      <section className="grid grid-cols-3 gap-3 mb-8">
        <Stat label="Total clients" value={grandTotal} />
        <Stat label="Active" value={grandActive} />
        <Stat label="At risk" value={grandAtRisk} accent={grandAtRisk > 0 ? "warn" : undefined} />
      </section>

      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">
              <th className="text-left p-4">Coach</th>
              <th className="text-right p-4">Active</th>
              <th className="text-right p-4">At risk</th>
              <th className="text-right p-4">Offboarded</th>
              <th className="text-right p-4">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.coach_id ?? "unassigned"} className="border-t border-[var(--color-line)]">
                <td className="p-4 font-semibold">{r.name}</td>
                <td className="p-4 text-right font-bold">{r.active}</td>
                <td className="p-4 text-right">
                  {r.atRiskTotal > 0 ? (
                    <span className="inline-flex items-center gap-2">
                      {r.atRiskHigh > 0 ? (
                        <span className="text-[10px] uppercase tracking-[1.5px] font-bold px-2 py-0.5 rounded-full bg-[rgba(239,68,68,0.15)] text-[var(--color-danger)]">
                          {r.atRiskHigh} high
                        </span>
                      ) : null}
                      {r.atRiskMedium > 0 ? (
                        <span className="text-[10px] uppercase tracking-[1.5px] font-bold px-2 py-0.5 rounded-full bg-[rgba(245,158,11,0.15)] text-[var(--color-warn)]">
                          {r.atRiskMedium} med
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-[var(--color-subtle)]">&mdash;</span>
                  )}
                </td>
                <td className="p-4 text-right text-[var(--color-muted)]">{r.offboarded}</td>
                <td className="p-4 text-right text-[var(--color-muted)]">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <div className="p-6 text-sm text-[var(--color-muted)] text-center">
            No coaches in your team yet. <Link href="/app/team" className="text-[var(--color-blue-glow)] font-semibold">Invite trainers</Link> to start splitting the load.
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "warn" | "danger" }) {
  const color = accent === "danger" ? "var(--color-danger)" : accent === "warn" ? "var(--color-warn)" : "var(--color-ink)";
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5">
      <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">{label}</div>
      <div className="text-3xl font-extrabold" style={{ color }}>{value}</div>
    </div>
  );
}
