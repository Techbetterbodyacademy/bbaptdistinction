import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createTemplate } from "./actions";

const KINDS = ["postural", "movement", "strength", "mobility", "cardio"] as const;

export default async function AssessmentTemplatesPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const { data: templates } = await supabase
    .from("assessment_template")
    .select("id, title, kind, description, assessment_template_item(count)")
    .eq("workspace_id", workspace!.id)
    .order("created_at", { ascending: false });

  return (
    <main className="px-10 py-10 max-w-4xl">
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Reusable
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Assessment templates</h1>
        <p className="text-[var(--color-muted)] mt-2">
          Build once, apply to many clients. Each template has its own set of items (head tilt, mobility scores, etc.).
        </p>
      </header>

      {sp.saved === "1" ? <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Saved.</div> : null}
      {sp.error ? <div className="mb-6 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm">{sp.error}</div> : null}

      <form action={createTemplate} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-8 space-y-4">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)]">New template</h2>
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" name="title" required placeholder="Postural screen" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="kind">Kind</label>
          <select id="kind" name="kind" defaultValue="postural" className="input">
            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="description">Description (optional)</label>
          <textarea id="description" name="description" rows={2} className="input resize-y" />
        </div>
        <button type="submit" className="btn btn-primary">Create template</button>
      </form>

      <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
        Templates ({templates?.length ?? 0})
      </h2>
      {(!templates || templates.length === 0) ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)]">None yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((t) => {
            const itemCount = Array.isArray(t.assessment_template_item) ? t.assessment_template_item[0]?.count ?? 0 : 0;
            return (
              <Link
                key={t.id}
                href={`/app/assessments/${t.id}`}
                className="block bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5 hover:border-[var(--color-blue)] transition-colors"
              >
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <div className="font-bold">{t.title}</div>
                  <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-blue-glow)] font-bold">{t.kind}</div>
                </div>
                {t.description ? <div className="text-sm text-[var(--color-muted)] mb-2">{t.description}</div> : null}
                <div className="text-xs text-[var(--color-subtle)]">{itemCount} item{itemCount === 1 ? "" : "s"}</div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
