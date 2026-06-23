import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addItem, removeItem, deleteTemplate } from "./actions";

export default async function TemplateDetailPage({
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

  const { data: template } = await supabase
    .from("assessment_template")
    .select("id, title, kind, description")
    .eq("id", id)
    .eq("workspace_id", workspace!.id)
    .maybeSingle();

  if (!template) notFound();

  const { data: items } = await supabase
    .from("assessment_template_item")
    .select("id, label, unit, target_value, order_index")
    .eq("template_id", template.id)
    .order("order_index");

  return (
    <main className="px-10 py-10 max-w-3xl">
      <Link href="/app/assessments" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">&larr; All templates</Link>
      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">{template.kind}</div>
        <h1 className="text-3xl font-extrabold tracking-tight">{template.title}</h1>
        {template.description ? <p className="text-[var(--color-muted)] mt-2">{template.description}</p> : null}
      </header>

      {sp.error ? <div className="mb-6 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm">{sp.error}</div> : null}

      <section className="mb-8">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">Items ({items?.length ?? 0})</h2>
        {(items?.length ?? 0) === 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)] mb-4">
            No items yet.
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {items!.map((item, idx) => (
              <form key={item.id} action={removeItem} className="flex items-center gap-3 p-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
                <input type="hidden" name="template_id" value={template.id} />
                <input type="hidden" name="item_id" value={item.id} />
                <div className="text-xs text-[var(--color-subtle)] font-bold w-6">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{item.label}</div>
                  <div className="text-xs text-[var(--color-muted)] mt-1">
                    {item.unit ? `Unit: ${item.unit}` : "No unit"}
                    {item.target_value !== null ? ` · Target: ${item.target_value}` : ""}
                  </div>
                </div>
                <button type="submit" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]">Remove</button>
              </form>
            ))}
          </div>
        )}

        <form action={addItem} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5 space-y-3">
          <input type="hidden" name="template_id" value={template.id} />
          <input type="hidden" name="order_index" value={(items?.length ?? 0) + 1} />
          <h3 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)]">Add item</h3>
          <input name="label" required placeholder="Forward head tilt" className="input" />
          <div className="grid grid-cols-2 gap-3">
            <input name="unit" placeholder="Unit (cm, deg, reps)" className="input" />
            <input name="target_value" type="number" step="0.1" placeholder="Target value (optional)" className="input" />
          </div>
          <button type="submit" className="btn btn-primary">Add item</button>
        </form>
      </section>

      <form action={deleteTemplate} className="bg-[var(--color-surface)] border border-[rgba(239,68,68,0.2)] rounded-2xl p-5 flex items-center justify-between gap-4">
        <input type="hidden" name="template_id" value={template.id} />
        <div className="text-sm text-[var(--color-muted)]">Delete this template (existing client assessments are untouched).</div>
        <button type="submit" className="btn btn-ghost text-[var(--color-danger)]">Delete</button>
      </form>
    </main>
  );
}
