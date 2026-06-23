import Link from "next/link";
import { generateProgram } from "./actions";

export default async function NewAIProgramPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <main className="px-10 py-10 max-w-2xl">
      <Link href="/app/programs" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Back to programs
      </Link>
      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          AI program generator
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Draft a program with AI</h1>
        <p className="text-[var(--color-muted)] mt-2">
          GPT drafts the structure (weeks × workouts × exercises). You edit, you publish.
        </p>
      </header>

      <form action={generateProgram} className="space-y-5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7">
        <div>
          <label className="label" htmlFor="name">Program name</label>
          <input id="name" name="name" required defaultValue="Foundations 12-week" className="input" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="audience">Audience</label>
            <select id="audience" name="audience" defaultValue="men-40-60" className="input">
              <option value="men-40-60">Men 40-60</option>
              <option value="women-35-60">Women 35-60</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="weeks">Weeks</label>
            <input id="weeks" name="weeks" type="number" min="1" max="52" defaultValue={12} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="sessions_per_week">Sessions per week</label>
            <input id="sessions_per_week" name="sessions_per_week" type="number" min="1" max="7" defaultValue={3} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="goal">Primary goal</label>
            <select id="goal" name="goal" defaultValue="fat loss" className="input">
              <option value="fat loss">Fat loss</option>
              <option value="strength">Strength</option>
              <option value="hypertrophy">Hypertrophy</option>
              <option value="general fitness">General fitness</option>
              <option value="conditioning">Conditioning</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="constraints">Constraints (optional)</label>
          <textarea
            id="constraints"
            name="constraints"
            rows={3}
            placeholder="e.g. knee-friendly, no overhead pressing, dumbbells only, 45 min sessions max"
            className="input resize-y"
          />
        </div>

        {sp.error ? (
          <div className="text-sm text-[var(--color-danger)]">
            {sp.error === "key"
              ? "OPENAI_API_KEY not set in Vercel."
              : sp.error === "ai"
                ? "AI request failed. Try again."
                : sp.error === "parse"
                  ? "AI returned invalid structure. Try again."
                  : "Could not generate. Try again."}
          </div>
        ) : null}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="btn btn-primary">Draft with AI</button>
          <Link href="/app/programs/new" className="btn btn-ghost text-sm">Or build from scratch</Link>
        </div>
      </form>
    </main>
  );
}
