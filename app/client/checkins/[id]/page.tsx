import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ClientCheckinDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clientProfile } = await supabase
    .from("client_profile")
    .select("id, workspace_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!clientProfile) {
    notFound();
  }

  const { data: checkin } = await supabase
    .from("check_in")
    .select("*")
    .eq("id", id)
    .eq("client_id", clientProfile.id)
    .maybeSingle();

  if (!checkin) {
    notFound();
  }

  const { data: workspace } = await supabase
    .from("workspace")
    .select("coach_name")
    .eq("id", clientProfile.workspace_id)
    .maybeSingle();

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/client/checkins" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; All check-ins
      </Link>

      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Check-in
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Week {checkin.week_number ?? "—"}
        </h1>
        <div className="text-sm text-[var(--color-muted)] mt-2">
          Submitted {new Date(checkin.submitted_at).toLocaleString()}
        </div>
      </header>

      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-5">
        <Stat label="Weight" value={checkin.weight_kg ? `${checkin.weight_kg} kg` : "—"} />
        <Stat label="Sleep" value={checkin.sleep_hours_avg ? `${checkin.sleep_hours_avg} hrs` : "—"} />
        <Stat label="Stress" value={checkin.stress_rating ? `${checkin.stress_rating}/10` : "—"} />
        <Stat label="Adherence" value={checkin.adherence_pct ? `${checkin.adherence_pct}%` : "—"} />
      </section>

      {checkin.wins ? (
        <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-4">
          <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-ok)] font-bold mb-2">Wins</div>
          <div className="whitespace-pre-wrap text-sm">{checkin.wins}</div>
        </section>
      ) : null}

      {checkin.struggles ? (
        <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-6">
          <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-warn)] font-bold mb-2">Struggles</div>
          <div className="whitespace-pre-wrap text-sm">{checkin.struggles}</div>
        </section>
      ) : null}

      <section className="bg-[var(--color-surface)] border border-[rgba(0,174,239,0.3)] rounded-2xl p-6">
        <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-blue-glow)] font-bold mb-3">
          {workspace?.coach_name ?? "Your coach"}&rsquo;s reply
        </div>
        {checkin.coach_response ? (
          <>
            <div className="whitespace-pre-wrap text-sm">{checkin.coach_response}</div>
            {checkin.coach_responded_at ? (
              <div className="text-xs text-[var(--color-subtle)] mt-3 pt-3 border-t border-[var(--color-line)]">
                Replied {new Date(checkin.coach_responded_at).toLocaleString()}
              </div>
            ) : null}
          </>
        ) : (
          <div className="text-sm text-[var(--color-muted)]">
            Waiting for a reply. You&rsquo;ll see it here as soon as your coach responds.
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-1">
        {label}
      </div>
      <div className="text-xl font-extrabold">{value}</div>
    </div>
  );
}
