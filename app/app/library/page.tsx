import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function LibraryPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const categoryFilter = (params.category ?? "").trim();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  let exercisesQuery = supabase
    .from("exercise")
    .select("id, name, category, primary_muscles, video_url, default_unit, created_at")
    .eq("workspace_id", workspace!.id)
    .order("name");

  if (categoryFilter) {
    exercisesQuery = exercisesQuery.eq("category", categoryFilter);
  }

  const { data: exercises } = await exercisesQuery;

  const filtered = (exercises ?? []).filter((e) =>
    !query || e.name.toLowerCase().includes(query.toLowerCase())
  );

  const categories = Array.from(
    new Set((exercises ?? []).map((e) => e.category).filter((c): c is string => Boolean(c)))
  ).sort();

  return (
    <main className="px-10 py-10 max-w-6xl">
      <header className="flex items-start justify-between mb-8 gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
            Library
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Exercises</h1>
          <p className="text-[var(--color-muted)] mt-2">
            {filtered.length} {filtered.length === 1 ? "exercise" : "exercises"}
          </p>
        </div>
        <Link href="/app/library/new" className="btn btn-primary shrink-0">
          Add exercise
        </Link>
      </header>

      <form className="flex flex-wrap items-center gap-3 mb-6" action="/app/library">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search exercises"
          className="input max-w-sm"
        />
        <CategoryPill current={categoryFilter} value="" label="All" />
        {categories.map((c) => (
          <CategoryPill key={c} current={categoryFilter} value={c} label={c} />
        ))}
      </form>

      {filtered.length === 0 ? (
        <EmptyState hasQuery={Boolean(query)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((e) => (
            <Link
              key={e.id}
              href={`/app/library/${e.id}/edit`}
              className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5 hover:border-[var(--color-blue)] transition-colors block"
            >
              <div className="font-semibold mb-1">{e.name}</div>
              {e.category ? (
                <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
                  {e.category}
                </div>
              ) : null}
              {e.primary_muscles && e.primary_muscles.length > 0 ? (
                <div className="flex flex-wrap gap-1 mb-2">
                  {e.primary_muscles.slice(0, 4).map((m: string) => (
                    <span
                      key={m}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[var(--color-muted)]"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              ) : null}
              {e.video_url ? (
                <div className="text-xs text-[var(--color-blue-glow)]">Video attached</div>
              ) : (
                <div className="text-xs text-[var(--color-subtle)]">No video</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function CategoryPill({
  current,
  value,
  label
}: {
  current: string;
  value: string;
  label: string;
}) {
  const active = current === value;
  return (
    <Link
      href={value ? `/app/library?category=${encodeURIComponent(value)}` : "/app/library"}
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
      <h2 className="text-lg font-bold mb-1">No exercises yet</h2>
      <p className="text-[var(--color-muted)] text-sm mb-6">
        Add your first exercise so you can use it in a program.
      </p>
      <Link href="/app/library/new" className="btn btn-primary">
        Add your first exercise
      </Link>
    </div>
  );
}
