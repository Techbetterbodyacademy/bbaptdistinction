import Link from "next/link";
import { createExercise } from "./actions";

const COMMON_CATEGORIES = ["Push", "Pull", "Legs", "Core", "Conditioning", "Mobility", "Full body"];

export default async function NewExercisePage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="px-10 py-10 max-w-2xl">
      <Link href="/app/library" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Back to library
      </Link>
      <header className="mb-8 mt-4">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          New exercise
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Add an exercise</h1>
        <p className="text-[var(--color-muted)] mt-2">
          Exercises live in your library and slot into any program you build.
        </p>
      </header>

      <form action={createExercise} className="space-y-5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Barbell back squat"
            className="input"
          />
        </div>

        <div>
          <label className="label" htmlFor="category">Category</label>
          <input
            id="category"
            name="category"
            type="text"
            list="category-suggestions"
            placeholder="Legs"
            className="input"
          />
          <datalist id="category-suggestions">
            {COMMON_CATEGORIES.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>

        <div>
          <label className="label" htmlFor="primary_muscles">Primary muscles</label>
          <input
            id="primary_muscles"
            name="primary_muscles"
            type="text"
            placeholder="Quads, glutes, core"
            className="input"
          />
          <p className="text-[var(--color-subtle)] text-xs mt-2">Comma-separated.</p>
        </div>

        <div>
          <label className="label" htmlFor="video_url">Video URL</label>
          <input
            id="video_url"
            name="video_url"
            type="url"
            placeholder="https://youtu.be/..."
            className="input"
          />
          <p className="text-[var(--color-subtle)] text-xs mt-2">Optional. YouTube, Vimeo, or any direct link.</p>
        </div>

        <div>
          <label className="label" htmlFor="default_unit">Default unit</label>
          <select id="default_unit" name="default_unit" defaultValue="kg" className="input">
            <option value="kg">Kilograms</option>
            <option value="lb">Pounds</option>
            <option value="bodyweight">Bodyweight</option>
            <option value="seconds">Seconds</option>
            <option value="meters">Meters</option>
          </select>
        </div>

        {params.error ? (
          <div className="text-sm text-[var(--color-danger)]">
            Could not save. Try again.
          </div>
        ) : null}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="btn btn-primary">Add exercise</button>
          <Link href="/app/library" className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </main>
  );
}
