import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addQuestion, deleteQuestion, deleteForm } from "./actions";
import { QUESTION_KINDS } from "@/lib/forms";

const KIND_LABELS: Record<string, string> = {
  text: "Short text",
  long_text: "Long text",
  email: "Email",
  number: "Number",
  choice: "Multiple choice",
  yes_no: "Yes/No"
};

export default async function FormDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
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

  const { data: form } = await supabase
    .from("form")
    .select("id, title, description")
    .eq("id", id)
    .eq("workspace_id", workspace!.id)
    .maybeSingle();

  if (!form) notFound();

  const [{ data: questions }, { data: responses }] = await Promise.all([
    supabase.from("form_question").select("id, label, kind, required, order_index, options").eq("form_id", id).order("order_index"),
    supabase.from("form_response").select("id, answers, created_at, buyer_email").eq("form_id", id).order("created_at", { ascending: false }).limit(20)
  ]);

  return (
    <main className="px-10 py-10 max-w-4xl">
      <Link href="/app/forms" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">&larr; All forms</Link>
      <header className="mt-4 mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">Form</div>
          <h1 className="text-3xl font-extrabold tracking-tight">{form.title}</h1>
          {form.description ? <p className="text-[var(--color-muted)] mt-2">{form.description}</p> : null}
        </div>
        <a href={`/f/${form.id}`} target="_blank" rel="noreferrer" className="btn btn-ghost text-sm shrink-0">Public link &rarr;</a>
      </header>

      {sp.error ? (
        <div className="mb-6 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm">{sp.error}</div>
      ) : null}

      <section className="mb-8">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">Questions ({questions?.length ?? 0})</h2>
        {(questions?.length ?? 0) === 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)]">No questions yet.</div>
        ) : (
          <div className="space-y-2 mb-4">
            {questions!.map((q, idx) => (
              <form key={q.id} action={deleteQuestion} className="flex items-start gap-3 p-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
                <input type="hidden" name="form_id" value={form.id} />
                <input type="hidden" name="question_id" value={q.id} />
                <div className="text-xs text-[var(--color-subtle)] font-bold shrink-0 mt-0.5">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{q.label} {q.required ? <span className="text-[var(--color-blue-glow)] text-xs">*</span> : null}</div>
                  <div className="text-xs text-[var(--color-muted)] mt-1">
                    {KIND_LABELS[q.kind]}
                    {q.kind === "choice" && Array.isArray(q.options) && q.options.length > 0
                      ? ` · ${(q.options as string[]).join(" / ")}`
                      : ""}
                  </div>
                </div>
                <button type="submit" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)] shrink-0">Remove</button>
              </form>
            ))}
          </div>
        )}

        <form action={addQuestion} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5 space-y-3">
          <input type="hidden" name="form_id" value={form.id} />
          <input type="hidden" name="order_index" value={questions?.length ?? 0} />
          <h3 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)]">Add a question</h3>
          <input name="label" required placeholder="What's your main fitness goal?" className="input" />
          <div className="grid grid-cols-2 gap-3">
            <select name="kind" defaultValue="text" className="input">
              {QUESTION_KINDS.map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="required" defaultChecked />
              <span>Required</span>
            </label>
          </div>
          <input name="options" placeholder="If multiple choice: comma-separated options (low, med, high)" className="input" />
          <button type="submit" className="btn btn-primary">Add question</button>
        </form>
      </section>

      <section className="mb-8">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">Responses ({responses?.length ?? 0})</h2>
        {(responses?.length ?? 0) === 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)]">No responses yet. Share the public link.</div>
        ) : (
          <div className="space-y-3">
            {responses!.map((r) => (
              <div key={r.id} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5">
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <div className="font-semibold text-sm">{r.buyer_email ?? "Anonymous"}</div>
                  <div className="text-xs text-[var(--color-subtle)]">{new Date(r.created_at).toLocaleString()}</div>
                </div>
                <pre className="text-xs whitespace-pre-wrap text-[var(--color-muted)] bg-[rgba(255,255,255,0.02)] rounded-lg p-3">{JSON.stringify(r.answers, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </section>

      <form action={deleteForm} className="bg-[var(--color-surface)] border border-[rgba(239,68,68,0.2)] rounded-2xl p-5 flex items-center justify-between gap-4">
        <input type="hidden" name="form_id" value={form.id} />
        <div className="text-sm text-[var(--color-muted)]">Delete this form (responses too).</div>
        <button type="submit" className="btn btn-ghost text-[var(--color-danger)]">Delete form</button>
      </form>
    </main>
  );
}
