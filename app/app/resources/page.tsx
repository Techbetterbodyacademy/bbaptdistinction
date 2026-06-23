import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type KindFilter = "all" | "video" | "pdf" | "recipe" | "article";

export default async function ResourcesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; kind?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const kind = (params.kind as KindFilter | undefined) ?? "all";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  let q = supabase
    .from("resource")
    .select("id, title, kind, audience, blob_url, external_url, tags, published, created_at")
    .eq("workspace_id", workspace!.id)
    .order("created_at", { ascending: false });

  if (kind !== "all") {
    q = q.eq("kind", kind);
  }

  const { data: resources } = await q;

  const filtered = (resources ?? []).filter((r) =>
    !query || r.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="px-10 py-10 max-w-6xl">
      <header className="flex items-start justify-between mb-8 gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
            Members area
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Resources</h1>
          <p className="text-[var(--color-muted)] mt-2">
            {filtered.length} {filtered.length === 1 ? "resource" : "resources"}
          </p>
        </div>
        <Link href="/app/resources/new" className="btn btn-primary shrink-0">
          Add resource
        </Link>
      </header>

      <form className="flex flex-wrap items-center gap-3 mb-6" action="/app/resources">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search resources"
          className="input max-w-sm"
        />
        <KindPill current={kind} value="all" label="All" />
        <KindPill current={kind} value="video" label="Videos" />
        <KindPill current={kind} value="pdf" label="PDFs" />
        <KindPill current={kind} value="recipe" label="Recipes" />
        <KindPill current={kind} value="article" label="Articles" />
      </form>

      {filtered.length === 0 ? (
        <EmptyState hasQuery={Boolean(query)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((r) => (
            <Link
              key={r.id}
              href={`/app/resources/${r.id}/edit`}
              className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5 hover:border-[var(--color-blue)] transition-colors block"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">
                  {r.kind}
                </div>
                {r.published ? (
                  <span className="text-[10px] uppercase tracking-[1.5px] font-bold px-2 py-0.5 rounded-full bg-[rgba(34,197,94,0.15)] text-[var(--color-ok)]">
                    Live
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-[1.5px] font-bold px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[var(--color-muted)]">
                    Draft
                  </span>
                )}
              </div>
              <div className="font-bold mb-2">{r.title}</div>
              {r.audience ? (
                <div className="text-xs text-[var(--color-muted)] mb-2">
                  Audience: <span className="capitalize">{r.audience}</span>
                </div>
              ) : null}
              {r.tags && r.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-2">
                  {r.tags.slice(0, 4).map((t: string) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[var(--color-muted)]">
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function KindPill({ current, value, label }: { current: string; value: string; label: string }) {
  const active = current === value;
  return (
    <Link
      href={value === "all" ? "/app/resources" : `/app/resources?kind=${value}`}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
        active
          ? "bg-[var(--color-blue)] text-black"
          : "border border-[var(--color-line)] text-[var(--color-muted)] hover:border-[var(--color-blue)] hover:text-[var(--color-blue)]"
      }`}
    >
      {label}
    </Link>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  if (hasQuery) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-12 text-center">
        <h2 className="text-lg font-bold mb-1">No matches</h2>
        <p className="text-[var(--color-muted)] text-sm">Try a different search.</p>
      </div>
    );
  }
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-12 text-center">
      <h2 className="text-lg font-bold mb-1">No resources yet</h2>
      <p className="text-[var(--color-muted)] text-sm mb-6">
        Drop videos, PDFs, recipes, and protocols. Tag by audience. Clients only see what matches their plan.
      </p>
      <Link href="/app/resources/new" className="btn btn-primary">
        Add your first resource
      </Link>
    </div>
  );
}
