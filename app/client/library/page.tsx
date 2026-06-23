import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ClientLibraryPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; kind?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const kind = params.kind;

  const supabase = await createClient();

  let q = supabase
    .from("resource")
    .select("id, title, kind, blob_url, external_url, tags, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (kind) {
    q = q.eq("kind", kind);
  }

  const { data: resources } = await q;

  // Sign URLs for any stored files so clients can open them
  const storedPaths = (resources ?? [])
    .map((r) => r.blob_url)
    .filter((p): p is string => Boolean(p));
  const signedMap: Record<string, string | null> = {};
  if (storedPaths.length > 0) {
    const { data } = await supabase.storage
      .from("resources")
      .createSignedUrls(storedPaths, 60 * 60);
    (data ?? []).forEach((row) => {
      if (row.path) signedMap[row.path] = row.signedUrl ?? null;
    });
  }

  const filtered = (resources ?? []).filter((r) =>
    !query || r.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/client" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Home
      </Link>

      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Members area
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Resources</h1>
        <p className="text-[var(--color-muted)] mt-2">
          Videos, PDFs, recipes, and protocols your coach has shared.
        </p>
      </header>

      <form className="flex flex-wrap items-center gap-3 mb-6" action="/client/library">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search"
          className="input max-w-sm"
        />
        <KindPill current={kind} value={undefined} label="All" />
        <KindPill current={kind} value="video" label="Videos" />
        <KindPill current={kind} value="pdf" label="PDFs" />
        <KindPill current={kind} value="recipe" label="Recipes" />
        <KindPill current={kind} value="article" label="Articles" />
      </form>

      {filtered.length === 0 ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-10 text-center">
          <h2 className="text-lg font-bold mb-2">No resources yet</h2>
          <p className="text-[var(--color-muted)] text-sm">
            Your coach hasn&rsquo;t shared anything matching this filter. Check back later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((r) => {
            const href = r.external_url ?? (r.blob_url ? signedMap[r.blob_url] : null) ?? "#";
            return (
              <a
                key={r.id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5 hover:border-[var(--color-blue)] transition-colors block"
              >
                <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
                  {r.kind}
                </div>
                <div className="font-bold mb-1">{r.title}</div>
                {r.tags && r.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {r.tags.slice(0, 4).map((t: string) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[var(--color-muted)]">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 text-xs text-[var(--color-blue-glow)]">
                  Open &rsaquo;
                </div>
              </a>
            );
          })}
        </div>
      )}
    </main>
  );
}

function KindPill({ current, value, label }: { current?: string; value?: string; label: string }) {
  const active = current === value || (!current && !value);
  const href = value ? `/client/library?kind=${value}` : "/client/library";
  return (
    <Link
      href={href}
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
