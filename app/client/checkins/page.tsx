import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ClientCheckinsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clientProfile } = await supabase
    .from("client_profile")
    .select("id, created_at")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!clientProfile) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-[var(--color-muted)]">Profile not found.</p>
      </main>
    );
  }

  const { data: checkins } = await supabase
    .from("check_in")
    .select("id, week_number, submitted_at, weight_kg, wins, struggles, coach_response, coach_responded_at")
    .eq("client_id", clientProfile.id)
    .order("submitted_at", { ascending: false })
    .limit(50);

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/client" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Home
      </Link>

      <header className="flex items-start justify-between gap-4 mt-4 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
            Weekly accountability
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Check-ins</h1>
          <p className="text-[var(--color-muted)] mt-2">
            {checkins?.length ?? 0} submitted
          </p>
        </div>
        <Link href="/client/checkins/new" className="btn btn-primary shrink-0">
          New check-in
        </Link>
      </header>

      {(!checkins || checkins.length === 0) ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-10 text-center">
          <h2 className="text-lg font-bold mb-2">First check-in</h2>
          <p className="text-[var(--color-muted)] text-sm mb-5">
            Tell your coach how the week went. Wins, struggles, the honest score.
          </p>
          <Link href="/client/checkins/new" className="btn btn-primary">Submit your first</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {checkins.map((c) => (
            <Link
              key={c.id}
              href={`/client/checkins/${c.id}`}
              className="block bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5 hover:border-[var(--color-blue)] transition-colors"
            >
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <div>
                  <div className="font-semibold">
                    Week {c.week_number ?? "—"}
                  </div>
                  <div className="text-xs text-[var(--color-muted)] mt-0.5">
                    {new Date(c.submitted_at).toLocaleDateString()}
                    {c.weight_kg ? ` · ${c.weight_kg} kg` : ""}
                  </div>
                </div>
                {c.coach_response ? (
                  <span className="text-[10px] uppercase tracking-[1.5px] font-bold px-2 py-1 rounded-full bg-[rgba(34,197,94,0.15)] text-[var(--color-ok)]">
                    Coach replied
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-[1.5px] font-bold px-2 py-1 rounded-full bg-[rgba(148,163,184,0.15)] text-[var(--color-warn)]">
                    Awaiting reply
                  </span>
                )}
              </div>
              {c.wins ? (
                <div className="text-sm mt-2">
                  <span className="text-[var(--color-ok)] font-semibold">Wins:</span>{" "}
                  <span className="text-[var(--color-muted)]">{c.wins}</span>
                </div>
              ) : null}
              {c.struggles ? (
                <div className="text-sm mt-1">
                  <span className="text-[var(--color-warn)] font-semibold">Struggles:</span>{" "}
                  <span className="text-[var(--color-muted)]">{c.struggles}</span>
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
