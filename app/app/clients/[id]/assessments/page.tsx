import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAssessment } from "./actions";

const KINDS = ["postural", "movement", "strength", "mobility", "cardio"] as const;

export default async function ClientAssessmentsPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id: clientId } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const { data: client } = await supabase
    .from("client_profile")
    .select("id, user_profile:user_id(full_name)")
    .eq("id", clientId)
    .eq("workspace_id", workspace!.id)
    .maybeSingle();

  if (!client) notFound();

  const { data: assessments } = await supabase
    .from("assessment")
    .select("id, title, kind, notes, performed_at")
    .eq("client_id", client.id)
    .order("performed_at", { ascending: false });

  const profile = Array.isArray(client.user_profile) ? client.user_profile[0] : client.user_profile;
  const name = profile?.full_name ?? "Client";

  return (
    <main className="px-10 py-10 max-w-3xl">
      <Link href={`/app/clients/${clientId}`} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; {name}
      </Link>
      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Assessments
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">{name}&rsquo;s assessments</h1>
      </header>

      {sp.saved === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Saved.</div>
      ) : null}
      {sp.error ? (
        <div className="mb-6 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm">
          {sp.error}
        </div>
      ) : null}

      <form action={createAssessment} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-8 space-y-4">
        <input type="hidden" name="client_id" value={clientId} />
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)]">New assessment</h2>
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" name="title" required placeholder="Initial postural assessment" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="kind">Kind</label>
          <select id="kind" name="kind" defaultValue="postural" className="input">
            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="notes">Notes (optional)</label>
          <textarea id="notes" name="notes" rows={3} placeholder="Forward head posture, anterior pelvic tilt, etc." className="input resize-y" />
        </div>
        <button type="submit" className="btn btn-primary">Save assessment</button>
      </form>

      <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
        Past assessments ({assessments?.length ?? 0})
      </h2>
      {(!assessments || assessments.length === 0) ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)]">
          None yet.
        </div>
      ) : (
        <div className="space-y-3">
          {assessments.map((a) => (
            <div key={a.id} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5">
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <div className="font-semibold">{a.title}</div>
                <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-blue-glow)] font-bold">
                  {a.kind}
                </div>
              </div>
              <div className="text-xs text-[var(--color-subtle)] mb-2">{new Date(a.performed_at).toLocaleString()}</div>
              {a.notes ? <div className="text-sm whitespace-pre-wrap">{a.notes}</div> : null}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
