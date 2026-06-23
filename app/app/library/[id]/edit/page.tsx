import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateExercise, deleteExercise } from "./actions";

const COMMON_CATEGORIES = ["Push", "Pull", "Legs", "Core", "Conditioning", "Mobility", "Full body"];

export default async function EditExercisePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
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

  const { data: exercise } = await supabase
    .from("exercise")
    .select("id, name, category, primary_muscles, video_url, default_unit")
    .eq("id", id)
    .eq("workspace_id", workspace!.id)
    .maybeSingle();

  if (!exercise) {
    notFound();
  }

  return (
    <main className="px-10 py-10 max-w-2xl">
      <Link href="/app/library" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Back to library
      </Link>
      <header className="mb-8 mt-4">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Edit exercise
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">{exercise.name}</h1>
      </header>

      {sp.saved === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Saved.</div>
      ) : null}

      <form action={updateExercise} className="space-y-5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7">
        <input type="hidden" name="id" value={exercise.id} />

        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" type="text" required defaultValue={exercise.name} className="input" />
        </div>

        <div>
          <label className="label" htmlFor="category">Category</label>
          <input id="category" name="category" type="text" list="category-suggestions" defaultValue={exercise.category ?? ""} className="input" />
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
            defaultValue={exercise.primary_muscles?.join(", ") ?? ""}
            className="input"
          />
          <p className="text-[var(--color-subtle)] text-xs mt-2">Comma-separated.</p>
        </div>

        <div>
          <label className="label" htmlFor="video_url">Video URL</label>
          <input id="video_url" name="video_url" type="url" defaultValue={exercise.video_url ?? ""} className="input" />
        </div>

        <div>
          <label className="label" htmlFor="default_unit">Default unit</label>
          <select id="default_unit" name="default_unit" defaultValue={exercise.default_unit ?? "kg"} className="input">
            <option value="kg">Kilograms</option>
            <option value="lb">Pounds</option>
            <option value="bodyweight">Bodyweight</option>
            <option value="seconds">Seconds</option>
            <option value="meters">Meters</option>
          </select>
        </div>

        {sp.error ? <div className="text-sm text-[var(--color-danger)]">Could not save. Try again.</div> : null}

        <div className="flex items-center justify-between pt-2">
          <button type="submit" className="btn btn-primary">Save changes</button>
        </div>
      </form>

      <form action={deleteExercise} className="mt-8 bg-[var(--color-surface)] border border-[rgba(239,68,68,0.2)] rounded-2xl p-6">
        <input type="hidden" name="id" value={exercise.id} />
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-bold mb-1">Delete this exercise</div>
            <div className="text-sm text-[var(--color-muted)]">
              Removes it from your library. Programs that used it will keep their references.
            </div>
          </div>
          <button type="submit" className="btn btn-ghost border-[rgba(239,68,68,0.4)] text-[var(--color-danger)]">
            Delete
          </button>
        </div>
      </form>
    </main>
  );
}
