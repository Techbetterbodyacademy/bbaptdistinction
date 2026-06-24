import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type StatusFilter = "all" | "draft" | "published" | "archived";

export default async function ProgramsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const status = (params.status as StatusFilter | undefined) ?? "all";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  let programsQuery = supabase
    .from("program")
    .select("id, name, description, weeks, status, version, created_at")
    .eq("workspace_id", workspace!.id)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    programsQuery = programsQuery.eq("status", status);
  }

  const { data: programs } = await programsQuery;

  const filtered = (programs ?? []).filter((p) =>
    !query || p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="px-10 py-10 max-w-6xl">
      <header className="flex items-start justify-between mb-8 gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
            Templates
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Programs</h1>
          <p className="text-[var(--color-muted)] mt-2">
            {filtered.length} {filtered.length === 1 ? "program" : "programs"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/app/programs/import-ptd" className="btn btn-ghost text-sm">
            Import from PTD
          </Link>
          <Link href="/app/programs/new-ai" className="btn btn-ghost text-sm">
            Draft with AI
          </Link>
          <Link href="/app/programs/new" className="btn btn-primary">
            New program
          </Link>
        </div>
      </header>

      <form className="flex flex-wrap items-center gap-3 mb-6" action="/app/programs">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search programs"
          className="input max-w-sm"
        />
        <StatusPill current={status} value="all" label="All" />
        <StatusPill current={status} value="draft" label="Draft" />
        <StatusPill current={status} value="published" label="Published" />
        <StatusPill current={status} value="archived" label="Archived" />
      </form>

      {filtered.length === 0 ? (
        <EmptyState hasQuery={Boolean(query)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/app/programs/${p.id}`}
              className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 hover:border-[var(--color-blue)] transition-colors block"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-lg font-bold">{p.name}</h2>
                <StatusBadge status={p.status} />
              </div>
              {p.description ? (
                <p className="text-sm text-[var(--color-muted)] mb-3 line-clamp-2">{p.description}</p>
              ) : null}
              <div className="flex items-center gap-4 text-xs text-[var(--color-subtle)]">
                <span>{p.weeks} weeks</span>
                <span>&middot;</span>
                <span>{p.version}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function StatusPill({
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
      href={value === "all" ? "/app/programs" : `/app/programs?status=${value}`}
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    draft: { bg: "rgba(255,255,255,0.06)", text: "var(--color-muted)" },
    published: { bg: "rgba(34,197,94,0.15)", text: "var(--color-ok)" },
    archived: { bg: "rgba(148,163,184,0.15)", text: "var(--color-warn)" }
  };
  const c = colors[status] ?? colors.draft;
  return (
    <span
      className="text-[10px] uppercase tracking-[1.5px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: c.bg, color: c.text }}
    >
      {status}
    </span>
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
      <h2 className="text-lg font-bold mb-1">No programs yet</h2>
      <p className="text-[var(--color-muted)] text-sm mb-6">
        Build your first program. Most coaches start with a 12-week template.
      </p>
      <Link href="/app/programs/new" className="btn btn-primary">
        Build your first program
      </Link>
    </div>
  );
}
