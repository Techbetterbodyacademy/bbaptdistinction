import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeTrend, type MetricDirection } from "@/lib/results";
import { recordMeasurement, deleteMeasurement } from "./actions";

export default async function ClientResultsPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id: clientId } = await params;
  const sp = await searchParams;

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
  if (!client) notFound();

  const profile = Array.isArray(client.user_profile) ? client.user_profile[0] : client.user_profile;
  const name = profile?.full_name ?? "Client";

  const [{ data: metrics }, { data: measurements }] = await Promise.all([
    supabase.from("tracked_metric").select("id, name, unit, direction").eq("workspace_id", workspace!.id).order("name"),
    supabase.from("client_measurement").select("id, metric_id, value, recorded_at, notes").eq("client_id", clientId).order("recorded_at", { ascending: false }).limit(500)
  ]);

  const groupedByMetric = new Map<string, { id: string; value: number; recorded_at: string; notes: string | null }[]>();
  (measurements ?? []).forEach((m) => {
    const arr = groupedByMetric.get(m.metric_id) ?? [];
    arr.push(m);
    groupedByMetric.set(m.metric_id, arr);
  });

  return (
    <main className="px-10 py-10 max-w-3xl">
      <Link href={`/app/clients/${clientId}`} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">&larr; {name}</Link>

      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">Results</div>
        <h1 className="text-3xl font-extrabold tracking-tight">{name}&rsquo;s metrics</h1>
      </header>

      {sp.saved === "1" ? <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Saved.</div> : null}
      {sp.error ? <div className="mb-6 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm">{sp.error}</div> : null}

      {(metrics?.length ?? 0) === 0 ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)]">
          No metrics defined. <Link href="/app/results" className="text-[var(--color-blue-glow)]">Create one first &rarr;</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {metrics!.map((metric) => {
            const ms = groupedByMetric.get(metric.id) ?? [];
            const trend = computeTrend(
              ms.map((m) => ({ value: Number(m.value), recorded_at: m.recorded_at })),
              metric.direction as MetricDirection
            );
            const trendColor =
              trend.label === "improving" ? "text-[var(--color-blue-glow)]" :
              trend.label === "worsening" ? "text-[var(--color-warn)]" :
              "text-[var(--color-muted)]";

            return (
              <section key={metric.id} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
                <header className="flex items-baseline justify-between gap-4 mb-4">
                  <div>
                    <div className="text-lg font-extrabold">{metric.name}</div>
                    <div className="text-xs text-[var(--color-subtle)]">{metric.unit}</div>
                  </div>
                  {ms.length > 1 ? (
                    <div className={`text-right ${trendColor}`}>
                      <div className="text-2xl font-extrabold">
                        {trend.delta > 0 ? "+" : ""}{trend.delta.toFixed(1)} {metric.unit}
                      </div>
                      <div className="text-[10px] uppercase tracking-[1.5px] font-bold capitalize">{trend.label.replace("_", " ")}</div>
                    </div>
                  ) : null}
                </header>

                <form action={recordMeasurement} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                  <input type="hidden" name="metric_id" value={metric.id} />
                  <input type="hidden" name="client_id" value={clientId} />
                  <input type="number" name="value" step="0.01" required placeholder={`Value in ${metric.unit}`} className="input" />
                  <input type="datetime-local" name="recorded_at" defaultValue={new Date().toISOString().slice(0, 16)} className="input" />
                  <button type="submit" className="btn btn-primary">Log</button>
                </form>

                {ms.length === 0 ? (
                  <div className="text-sm text-[var(--color-muted)]">No measurements yet.</div>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {ms.slice(0, 10).map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-3 py-2 border-b border-[var(--color-line)] last:border-0">
                        <span className="font-semibold">{Number(m.value).toFixed(2)} {metric.unit}</span>
                        <span className="text-xs text-[var(--color-muted)]">{new Date(m.recorded_at).toLocaleString()}</span>
                        <form action={deleteMeasurement}>
                          <input type="hidden" name="measurement_id" value={m.id} />
                          <input type="hidden" name="client_id" value={clientId} />
                          <button type="submit" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]">x</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
