import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createForm } from "./actions";

export default async function FormsPage({
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

  const { data: forms } = await supabase
    .from("form")
    .select("id, title, description, created_at, form_question(count), form_response(count)")
    .eq("workspace_id", workspace!.id)
    .order("created_at", { ascending: false });

  return (
    <main className="px-10 py-10 max-w-4xl">
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Intake & surveys
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Forms & Questionnaires</h1>
        <p className="text-[var(--color-muted)] mt-2">
          Custom intake forms. Share the link with prospects, see responses here.
        </p>
      </header>

      {sp.saved === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Saved.</div>
      ) : null}
      {sp.error ? (
        <div className="mb-6 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm">{sp.error}</div>
      ) : null}

      <form action={createForm} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-8 space-y-4">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)]">New form</h2>
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" name="title" required placeholder="New client intake" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="description">Description (optional)</label>
          <input id="description" name="description" placeholder="Tell us about your goals and lifestyle" className="input" />
        </div>
        <button type="submit" className="btn btn-primary">Create form</button>
      </form>

      <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
        Your forms ({forms?.length ?? 0})
      </h2>
      {(!forms || forms.length === 0) ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)]">None yet.</div>
      ) : (
        <div className="space-y-3">
          {forms.map((f) => {
            const qCount = Array.isArray(f.form_question) ? f.form_question[0]?.count ?? 0 : 0;
            const rCount = Array.isArray(f.form_response) ? f.form_response[0]?.count ?? 0 : 0;
            return (
              <Link
                key={f.id}
                href={`/app/forms/${f.id}`}
                className="block bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5 hover:border-[var(--color-blue)] transition-colors"
              >
                <div className="font-bold mb-1">{f.title}</div>
                {f.description ? <div className="text-sm text-[var(--color-muted)] mb-2">{f.description}</div> : null}
                <div className="text-xs text-[var(--color-subtle)]">{qCount} question{qCount === 1 ? "" : "s"} · {rCount} response{rCount === 1 ? "" : "s"}</div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
