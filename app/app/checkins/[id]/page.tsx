import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { replyToCheckin } from "./actions";

export default async function CoachCheckinDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const { data: checkin } = await supabase
    .from("check_in")
    .select(`
      *,
      client:client_id(id, workspace_id, user_profile:user_id(full_name))
    `)
    .eq("id", id)
    .maybeSingle();

  if (!checkin) {
    notFound();
  }

  const client = Array.isArray(checkin.client) ? checkin.client[0] : checkin.client;
  if (!client || client.workspace_id !== workspace!.id) {
    notFound();
  }

  const profile = Array.isArray(client.user_profile) ? client.user_profile[0] : client.user_profile;
  const name = profile?.full_name ?? "Client";

  return (
    <main className="px-10 py-10 max-w-3xl">
      <Link href="/app/checkins" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Cohort queue
      </Link>

      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          {name} &middot; Week {checkin.week_number ?? "—"}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Check-in</h1>
        <div className="text-sm text-[var(--color-muted)] mt-2">
          Submitted {new Date(checkin.submitted_at).toLocaleString()}
        </div>
      </header>

      {sp.saved === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">
          Reply sent.
        </div>
      ) : null}

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

      <form action={replyToCheckin} className="bg-[var(--color-surface)] border border-[rgba(0,174,239,0.3)] rounded-2xl p-6">
        <input type="hidden" name="checkin_id" value={checkin.id} />
        <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-blue-glow)] font-bold mb-3">
          {checkin.coach_response ? "Edit reply" : "Reply"}
        </div>
        <textarea
          name="coach_response"
          rows={5}
          required
          defaultValue={checkin.coach_response ?? ""}
          placeholder="Reflect on their week. Reinforce the win. Address one struggle with a concrete next step."
          className="input resize-y mb-3"
        />
        {sp.error ? (
          <div className="text-sm text-[var(--color-danger)] mb-3">Could not save. Try again.</div>
        ) : null}
        <div className="flex items-center gap-3">
          <Link href={`/app/clients/${client.id}`} className="btn btn-ghost text-sm">
            View {profile?.full_name?.split(" ")[0] ?? "client"}&rsquo;s profile
          </Link>
          <button type="submit" className="btn btn-primary ml-auto">
            {checkin.coach_response ? "Update reply" : "Send reply"}
          </button>
        </div>
        {checkin.coach_responded_at ? (
          <div className="text-xs text-[var(--color-subtle)] mt-3">
            Previously replied {new Date(checkin.coach_responded_at).toLocaleString()}
          </div>
        ) : null}
      </form>
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
