import { createClient } from "@/lib/supabase/server";
import { createPackage, togglePackage, deletePackage } from "./actions";
import { PACKAGE_INTERVALS, formatPriceCents } from "@/lib/packages";

const INTERVAL_LABELS: Record<string, string> = {
  one_time: "One-time",
  monthly: "Monthly",
  yearly: "Yearly"
};

export default async function PackagesPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id, slug")
    .eq("owner_id", user!.id)
    .single();

  const { data: packages } = await supabase
    .from("coaching_package")
    .select("id, name, description, price_cents, currency, interval, enabled")
    .eq("workspace_id", workspace!.id)
    .order("price_cents", { ascending: true });

  const buyUrl = workspace?.slug ? `/buy/${workspace.slug}` : null;

  return (
    <main className="px-10 py-10 max-w-4xl">
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Sell coaching
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Packages</h1>
        <p className="text-[var(--color-muted)] mt-2">
          Sell coaching packages with Stripe. Enabled packages appear on your public buy page.
        </p>
        {buyUrl ? (
          <a href={buyUrl} target="_blank" rel="noreferrer" className="text-sm text-[var(--color-blue-glow)] mt-2 inline-block">
            View your public buy page &rarr;
          </a>
        ) : null}
      </header>

      {sp.saved === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Saved.</div>
      ) : null}
      {sp.error ? (
        <div className="mb-6 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm">{sp.error}</div>
      ) : null}

      <form action={createPackage} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-8 space-y-4">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)]">New package</h2>
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required placeholder="3-month coaching" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="description">Description (optional)</label>
          <textarea id="description" name="description" rows={2} placeholder="Weekly check-ins, custom program, unlimited messaging" className="input resize-y" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="price">Price</label>
            <input id="price" name="price" type="number" min="1" step="0.01" required placeholder="499" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="currency">Currency</label>
            <select id="currency" name="currency" defaultValue="usd" className="input">
              <option value="usd">USD</option>
              <option value="aud">AUD</option>
              <option value="gbp">GBP</option>
              <option value="eur">EUR</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="interval">Billing</label>
            <select id="interval" name="interval" defaultValue="one_time" className="input">
              {PACKAGE_INTERVALS.map((i) => <option key={i} value={i}>{INTERVAL_LABELS[i]}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" className="btn btn-primary">Create package</button>
      </form>

      <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
        Your packages ({packages?.length ?? 0})
      </h2>
      {(!packages || packages.length === 0) ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)]">
          None yet.
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map((p) => (
            <div key={p.id} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5">
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <div className="font-semibold">{p.name}</div>
                <div className="text-2xl font-extrabold">
                  {formatPriceCents(p.price_cents, p.currency)}
                  <span className="text-xs font-normal text-[var(--color-muted)] ml-1">/ {INTERVAL_LABELS[p.interval].toLowerCase()}</span>
                </div>
              </div>
              {p.description ? <div className="text-sm text-[var(--color-muted)] mb-3">{p.description}</div> : null}
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase tracking-[1.5px] font-bold ${p.enabled ? "text-[var(--color-blue-glow)]" : "text-[var(--color-subtle)]"}`}>
                  {p.enabled ? "Live" : "Hidden"}
                </span>
                <form action={togglePackage} className="ml-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="enabled" value={p.enabled ? "false" : "true"} />
                  <button type="submit" className="btn btn-ghost text-xs">
                    {p.enabled ? "Hide" : "Show"}
                  </button>
                </form>
                <form action={deletePackage}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)] px-3 py-2">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
