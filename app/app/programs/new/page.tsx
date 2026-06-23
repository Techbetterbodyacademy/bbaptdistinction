import Link from "next/link";
import { createProgram } from "./actions";

export default async function NewProgramPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="px-10 py-10 max-w-2xl">
      <Link href="/app/programs" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Back to programs
      </Link>
      <header className="mb-8 mt-4">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          New program
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Start a program</h1>
        <p className="text-[var(--color-muted)] mt-2">
          You can edit weeks, workouts, and exercises on the next screen.
        </p>
      </header>

      <form action={createProgram} className="space-y-5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7">
        <div>
          <label className="label" htmlFor="name">Program name</label>
          <input id="name" name="name" type="text" required placeholder="Foundations · Men 40+" className="input" />
        </div>

        <div>
          <label className="label" htmlFor="description">Short description</label>
          <textarea
            id="description"
            name="description"
            rows={2}
            placeholder="3 sessions a week, full body, designed for guys returning to the gym."
            className="input resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="weeks">Length (weeks)</label>
            <input id="weeks" name="weeks" type="number" min="1" max="52" defaultValue={12} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="audience">Audience</label>
            <select id="audience" name="audience" defaultValue="men-40-60" className="input">
              <option value="men-40-60">Men 40-60</option>
              <option value="women-35-60">Women 35-60</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
        </div>

        {params.error ? <div className="text-sm text-[var(--color-danger)]">Could not create. Try again.</div> : null}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="btn btn-primary">Create program</button>
          <Link href="/app/programs" className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </main>
  );
}
