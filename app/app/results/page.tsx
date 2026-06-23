import { createClient } from "@/lib/supabase/server";
import { createMetric, deleteMetric } from "./actions";

const DIRECTION_LABELS: Record<string, string> = {
  lower_better: "Lower = better",
  higher_better: "Higher = better",
  neutral: "Neutral"
};

export default async function ResultsPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const { data: metrics } = await supabase
    .from("tracked_metric")
    .select("id, name, unit, direction, client_measurement(count)")
    .eq("workspace_id", workspace!.id)
    .order("name");

  return (
    <main className="px-10 py-10 max-w-3xl">
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Custom client metrics
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Results tracking</h1>
        <p className="text-[var(--color-muted)] mt-2">
          Track whatever matters for your clients: waist, body fat, sleep, mood, calories.
        </p>
      </header>

      {sp.saved === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Saved.</div>
      ) : null}
      {sp.error ? (
        <div className="mb-6 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm">{sp.error}</div>
      ) : null}

      <form action={createMetric} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-8 space-y-4">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)]">New metric</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" name="name" required placeholder="Waist" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="unit">Unit</label>
            <input id="unit" name="unit" required placeholder="cm" className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="direction">Direction</label>
          <select id="direction" name="direction" defaultValue="lower_better" className="input">
            <option value="lower_better">Lower is better (waist, body fat, soreness)</option>
            <option value="higher_better">Higher is better (sleep hours, strength)</option>
            <option value="neutral">Neutral (record only)</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Add metric</button>
      </form>

      <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
        Tracked metrics ({metrics?.length ?? 0})
      </h2>
      {(!metrics || metrics.length === 0) ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)]">None yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {metrics.map((m) => {
            const count = Array.isArray(m.client_measurement) ? m.client_measurement[0]?.count ?? 0 : 0;
            return (
              <div key={m.id} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <div className="font-bold">{m.name}</div>
                  <div className="text-xs text-[var(--color-subtle)]">{m.unit}</div>
                </div>
                <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-3">
                  {DIRECTION_LABELS[m.direction]}
                </div>
                <div className="text-xs text-[var(--color-muted)] mb-3">{count} measurement{count === 1 ? "" : "s"} logged</div>
                <form action={deleteMetric}>
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]">Remove</button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
