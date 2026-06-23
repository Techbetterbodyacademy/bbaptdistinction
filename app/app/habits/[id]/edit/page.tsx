import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateHabit, deleteHabit } from "./actions";

export default async function EditHabitPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
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

  const { data: habit } = await supabase
    .from("habit")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspace!.id)
    .maybeSingle();

  if (!habit) notFound();

  return (
    <main className="px-10 py-10 max-w-2xl">
      <Link href="/app/habits" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Back to habits
      </Link>
      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Edit habit
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">{habit.name}</h1>
      </header>

      {sp.saved === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Saved.</div>
      ) : null}

      <form action={updateHabit} className="space-y-5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7">
        <input type="hidden" name="id" value={habit.id} />
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" type="text" required defaultValue={habit.name} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={2} defaultValue={habit.description ?? ""} className="input resize-y" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="category">Category</label>
            <input id="category" name="category" type="text" defaultValue={habit.category ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="default_frequency">Default frequency</label>
            <select id="default_frequency" name="default_frequency" defaultValue={habit.default_frequency ?? "daily"} className="input">
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays only</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="default_target_value">Default target value</label>
            <input id="default_target_value" name="default_target_value" type="number" step="0.1" defaultValue={habit.default_target_value ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="default_target_unit">Unit</label>
            <input id="default_target_unit" name="default_target_unit" type="text" defaultValue={habit.default_target_unit ?? ""} className="input" />
          </div>
        </div>
        <button type="submit" className="btn btn-primary">Save changes</button>
      </form>

      <form action={deleteHabit} className="mt-8 bg-[var(--color-surface)] border border-[rgba(239,68,68,0.2)] rounded-2xl p-6">
        <input type="hidden" name="id" value={habit.id} />
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-bold mb-1">Delete this habit</div>
            <div className="text-sm text-[var(--color-muted)]">Removes from the library + unassigns from all clients.</div>
          </div>
          <button type="submit" className="btn btn-ghost border-[rgba(239,68,68,0.4)] text-[var(--color-danger)]">
            Delete
          </button>
        </div>
      </form>
    </main>
  );
}
