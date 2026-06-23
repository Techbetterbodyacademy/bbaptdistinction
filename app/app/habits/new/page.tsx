import Link from "next/link";
import { createHabit } from "./actions";

export default async function NewHabitPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="px-10 py-10 max-w-2xl">
      <Link href="/app/habits" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Back to habits
      </Link>
      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          New habit
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Define a habit</h1>
        <p className="text-[var(--color-muted)] mt-2">
          Habits go in the library first. Then you assign them to specific clients.
        </p>
      </header>

      <form action={createHabit} className="space-y-5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" type="text" required placeholder="10,000 steps daily" className="input" />
        </div>

        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={2} placeholder="What does done look like? Why does it matter?" className="input resize-y" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="category">Category</label>
            <input id="category" name="category" type="text" placeholder="Movement / Sleep / Nutrition / Mindset" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="default_frequency">Default frequency</label>
            <select id="default_frequency" name="default_frequency" defaultValue="daily" className="input">
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays only</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom (set per client)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="default_target_value">Default target value</label>
            <input id="default_target_value" name="default_target_value" type="number" step="0.1" placeholder="10000" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="default_target_unit">Unit</label>
            <input id="default_target_unit" name="default_target_unit" type="text" placeholder="steps / hours / liters / grams" className="input" />
          </div>
        </div>

        {params.error ? <div className="text-sm text-[var(--color-danger)]">Could not save. Try again.</div> : null}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="btn btn-primary">Add habit</button>
          <Link href="/app/habits" className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </main>
  );
}
