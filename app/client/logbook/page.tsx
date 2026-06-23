import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Sparkline } from "@/components/sparkline";

export default async function ClientLogbookPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clientProfile } = await supabase
    .from("client_profile")
    .select("id, start_weight_kg, current_weight_kg")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!clientProfile) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-[var(--color-muted)]">Profile not found.</p>
      </main>
    );
  }

  const { data: entries } = await supabase
    .from("transformation_entry")
    .select("id, entry_date, weight_kg, body_fat_pct, waist_cm, sleep_hours_avg, stress_rating")
    .eq("client_id", clientProfile.id)
    .order("entry_date", { ascending: false })
    .limit(50);

  const sorted = (entries ?? []).slice().reverse();
  const weightPoints = sorted.map((e) => ({ x: e.entry_date, y: e.weight_kg }));
  const waistPoints = sorted.map((e) => ({ x: e.entry_date, y: e.waist_cm }));

  const latest = entries?.[0];
  const earliest = sorted[0];
  const weightDelta =
    latest?.weight_kg && earliest?.weight_kg && latest.weight_kg !== earliest.weight_kg
      ? (latest.weight_kg - earliest.weight_kg).toFixed(1)
      : null;

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/client" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Home
      </Link>

      <header className="flex items-start justify-between gap-4 mt-4 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
            Logbook
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Your transformation</h1>
          <p className="text-[var(--color-muted)] mt-2">
            {entries?.length ?? 0} entries
          </p>
        </div>
        <Link href="/client/logbook/new" className="btn btn-primary shrink-0">
          New entry
        </Link>
      </header>

      {entries && entries.length > 0 ? (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">
                Weight
              </div>
              {weightDelta ? (
                <div
                  className={`text-xs font-bold ${Number(weightDelta) < 0 ? "text-[var(--color-ok)]" : "text-[var(--color-warn)]"}`}
                >
                  {Number(weightDelta) > 0 ? "+" : ""}{weightDelta} kg
                </div>
              ) : null}
            </div>
            <div className="text-2xl font-extrabold mb-2">
              {latest?.weight_kg ? `${latest.weight_kg} kg` : "—"}
            </div>
            <Sparkline points={weightPoints} width={260} height={48} />
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5">
            <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
              Waist
            </div>
            <div className="text-2xl font-extrabold mb-2">
              {latest?.waist_cm ? `${latest.waist_cm} cm` : "—"}
            </div>
            <Sparkline points={waistPoints} width={260} height={48} color="var(--color-warn)" />
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
          Entries
        </h2>
        {(!entries || entries.length === 0) ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-10 text-center">
            <h3 className="text-lg font-bold mb-2">No entries yet</h3>
            <p className="text-[var(--color-muted)] text-sm mb-5">
              Log your weight + measurements + photos. Even one a week builds the picture.
            </p>
            <Link href="/client/logbook/new" className="btn btn-primary">Log your first entry</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <Link
                key={e.id}
                href={`/client/logbook/${e.id}`}
                className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-blue)] transition-colors"
              >
                <div>
                  <div className="font-semibold">{new Date(e.entry_date).toLocaleDateString()}</div>
                  <div className="text-xs text-[var(--color-muted)] mt-0.5">
                    {e.weight_kg ? `${e.weight_kg} kg` : ""}
                    {e.waist_cm ? ` · waist ${e.waist_cm} cm` : ""}
                    {e.body_fat_pct ? ` · ${e.body_fat_pct}% BF` : ""}
                  </div>
                </div>
                <span className="text-[var(--color-subtle)] text-lg">&rsaquo;</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
