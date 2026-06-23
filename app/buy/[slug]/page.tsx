import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPriceCents } from "@/lib/packages";
import { startCheckout } from "./actions";

const INTERVAL_LABELS: Record<string, string> = {
  one_time: "one-time",
  monthly: "per month",
  yearly: "per year"
};

export default async function BuyPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspace")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (!workspace) notFound();

  const { data: packages } = await supabase
    .from("coaching_package")
    .select("id, name, description, price_cents, currency, interval")
    .eq("workspace_id", workspace.id)
    .eq("enabled", true)
    .order("price_cents", { ascending: true });

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <header className="text-center mb-12">
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-3">
            Coaching with
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">{workspace.name}</h1>
          <p className="text-[var(--color-muted)] mt-3 text-lg">Pick a package below to get started.</p>
        </header>

        {sp.cancelled === "1" ? (
          <div className="mb-8 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.3)] rounded-xl p-4 text-sm text-center">
            Checkout cancelled. No charge was made.
          </div>
        ) : null}

        {!packages || packages.length === 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-8 text-center text-[var(--color-muted)]">
            No packages available right now. Check back soon.
          </div>
        ) : (
          <div className="space-y-4">
            {packages.map((p) => (
              <form
                key={p.id}
                action={startCheckout}
                className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7 hover:border-[var(--color-blue)] transition-colors"
              >
                <input type="hidden" name="package_id" value={p.id} />
                <input type="hidden" name="slug" value={slug} />
                <div className="flex items-baseline justify-between gap-4 mb-2">
                  <h2 className="text-xl font-extrabold tracking-tight">{p.name}</h2>
                  <div className="text-3xl font-extrabold">
                    {formatPriceCents(p.price_cents, p.currency)}
                    <span className="text-xs font-normal text-[var(--color-muted)] ml-1">
                      {INTERVAL_LABELS[p.interval]}
                    </span>
                  </div>
                </div>
                {p.description ? (
                  <p className="text-[var(--color-muted)] mb-4">{p.description}</p>
                ) : null}
                <button type="submit" className="btn btn-primary">
                  Buy with Stripe &rarr;
                </button>
              </form>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
