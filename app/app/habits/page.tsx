import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HabitsLibraryPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const { data: habits } = await supabase
    .from("habit")
    .select("id, name, description, category, default_frequency, default_target_value, default_target_unit, created_at")
    .eq("workspace_id", workspace!.id)
    .order("name");

  const filtered = (habits ?? []).filter((h) =>
    !query || h.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="px-10 py-10 max-w-6xl">
      <header className="flex items-start justify-between mb-8 gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
            Library
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Habits</h1>
          <p className="text-[var(--color-muted)] mt-2">
            {filtered.length} habit{filtered.length === 1 ? "" : "s"} you can assign to any client
          </p>
        </div>
        <Link href="/app/habits/new" className="btn btn-primary shrink-0">
          New habit
        </Link>
      </header>

      <form className="mb-6" action="/app/habits">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search habits"
          className="input max-w-sm"
        />
      </form>

      {filtered.length === 0 ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-12 text-center">
          <h2 className="text-lg font-bold mb-2">No habits yet</h2>
          <p className="text-[var(--color-muted)] text-sm mb-5">
            Examples: 10,000 steps daily, 8 hours of sleep, no alcohol Mon-Fri, hit protein target.
          </p>
          <Link href="/app/habits/new" className="btn btn-primary">Create your first habit</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((h) => (
            <Link
              key={h.id}
              href={`/app/habits/${h.id}/edit`}
              className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5 hover:border-[var(--color-blue)] transition-colors block"
            >
              <div className="font-semibold mb-1">{h.name}</div>
              {h.category ? (
                <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
                  {h.category}
                </div>
              ) : null}
              {h.description ? (
                <p className="text-sm text-[var(--color-muted)] mb-3 line-clamp-2">{h.description}</p>
              ) : null}
              <div className="text-xs text-[var(--color-subtle)] flex items-center gap-2">
                <span className="capitalize">{h.default_frequency}</span>
                {h.default_target_value && h.default_target_unit ? (
                  <>
                    <span>·</span>
                    <span>{h.default_target_value} {h.default_target_unit}</span>
                  </>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
