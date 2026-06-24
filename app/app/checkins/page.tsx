import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type FilterMode = "pending" | "all" | "replied";

export default async function CoachCheckinsPage({
  searchParams
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter: FilterMode = params.filter === "all" ? "all" : params.filter === "replied" ? "replied" : "pending";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  let query = supabase
    .from("check_in")
    .select(`
      id, week_number, submitted_at, weight_kg, wins, struggles, coach_response, coach_responded_at, adherence_pct, stress_rating,
      client:client_id(id, user_profile:user_id(full_name))
    `)
    .in("client_id",
      (await supabase.from("client_profile").select("id").eq("workspace_id", workspace!.id))
        .data?.map((c) => c.id) ?? []
    )
    .order("submitted_at", { ascending: false })
    .limit(100);

  if (filter === "pending") {
    query = query.is("coach_response", null);
  } else if (filter === "replied") {
    query = query.not("coach_response", "is", null);
  }

  const { data: checkins } = await query;

  return (
    <main className="px-10 py-10 max-w-5xl">
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Cohort queue
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Check-ins</h1>
        <p className="text-[var(--color-muted)] mt-2">
          {checkins?.length ?? 0} {filter === "pending" ? "awaiting reply" : filter === "replied" ? "answered" : "total"}
        </p>
      </header>

      <div className="flex items-center gap-3 mb-6">
        <FilterPill current={filter} value="pending" label="Awaiting reply" />
        <FilterPill current={filter} value="replied" label="Replied" />
        <FilterPill current={filter} value="all" label="All" />
      </div>

      {(!checkins || checkins.length === 0) ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-12 text-center">
          <h2 className="text-lg font-bold mb-1">Inbox zero</h2>
          <p className="text-[var(--color-muted)] text-sm">
            {filter === "pending"
              ? "No outstanding check-ins. Nice."
              : "No check-ins in this filter yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {checkins.map((c) => {
            const client = Array.isArray(c.client) ? c.client[0] : c.client;
            const profile = Array.isArray(client?.user_profile) ? client?.user_profile[0] : client?.user_profile;
            const name = profile?.full_name ?? "Client";
            const initials = name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
            return (
              <Link
                key={c.id}
                href={`/app/checkins/${c.id}`}
                className="flex items-start gap-4 p-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-blue)] transition-colors"
              >
                <div className="shrink-0 w-11 h-11 rounded-full bg-[rgba(0,174,239,0.15)] text-[var(--color-blue-glow)] font-extrabold text-sm flex items-center justify-center">
                  {initials || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold truncate">{name}</span>
                    <span className="text-xs text-[var(--color-subtle)]">Week {c.week_number ?? "—"}</span>
                  </div>
                  <div className="text-xs text-[var(--color-muted)] mt-0.5 mb-2">
                    {new Date(c.submitted_at).toLocaleDateString()}
                    {c.weight_kg ? ` · ${c.weight_kg} kg` : ""}
                    {c.adherence_pct ? ` · ${c.adherence_pct}% adherence` : ""}
                    {c.stress_rating ? ` · stress ${c.stress_rating}/10` : ""}
                  </div>
                  {c.wins ? (
                    <div className="text-sm line-clamp-1">
                      <span className="text-[var(--color-ok)] font-semibold">Wins:</span>{" "}
                      <span className="text-[var(--color-muted)]">{c.wins}</span>
                    </div>
                  ) : null}
                  {c.struggles ? (
                    <div className="text-sm line-clamp-1 mt-0.5">
                      <span className="text-[var(--color-warn)] font-semibold">Struggles:</span>{" "}
                      <span className="text-[var(--color-muted)]">{c.struggles}</span>
                    </div>
                  ) : null}
                </div>
                {c.coach_response ? (
                  <span className="text-[10px] uppercase tracking-[1.5px] font-bold px-2 py-1 rounded-full bg-[rgba(34,197,94,0.15)] text-[var(--color-ok)] shrink-0">
                    Replied
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-[1.5px] font-bold px-2 py-1 rounded-full bg-[rgba(148,163,184,0.15)] text-[var(--color-warn)] shrink-0">
                    Pending
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

function FilterPill({ current, value, label }: { current: string; value: string; label: string }) {
  const active = current === value;
  return (
    <Link
      href={value === "pending" ? "/app/checkins" : `/app/checkins?filter=${value}`}
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
