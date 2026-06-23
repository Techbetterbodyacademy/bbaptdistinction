import Link from "next/link";
import { submitTransformationEntry } from "./actions";

export default async function NewLogbookEntryPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/client/logbook" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Back to logbook
      </Link>

      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          New entry
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Log your check-in</h1>
        <p className="text-[var(--color-muted)] mt-2">
          Fill what you measured. Skip the rest. Photos are optional but they tell the story.
        </p>
      </header>

      <form
        action={submitTransformationEntry}
        encType="multipart/form-data"
        className="space-y-6"
      >
        <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
          <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-4">
            Numbers
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label" htmlFor="entry_date">Date</label>
              <input id="entry_date" name="entry_date" type="date" defaultValue={today} required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="weight_kg">Weight (kg)</label>
              <input id="weight_kg" name="weight_kg" type="number" step="0.1" min="0" inputMode="decimal" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="body_fat_pct">Body fat %</label>
              <input id="body_fat_pct" name="body_fat_pct" type="number" step="0.1" min="0" max="100" inputMode="decimal" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="sleep_hours_avg">Avg sleep (hrs)</label>
              <input id="sleep_hours_avg" name="sleep_hours_avg" type="number" step="0.1" min="0" max="24" inputMode="decimal" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="stress_rating">Stress (1-10)</label>
              <input id="stress_rating" name="stress_rating" type="number" min="1" max="10" inputMode="numeric" className="input" />
            </div>
          </div>
        </section>

        <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
          <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-4">
            Measurements (cm)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="label" htmlFor="waist_cm">Waist</label>
              <input id="waist_cm" name="waist_cm" type="number" step="0.1" min="0" inputMode="decimal" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="hips_cm">Hips</label>
              <input id="hips_cm" name="hips_cm" type="number" step="0.1" min="0" inputMode="decimal" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="chest_cm">Chest</label>
              <input id="chest_cm" name="chest_cm" type="number" step="0.1" min="0" inputMode="decimal" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="arm_cm">Arm</label>
              <input id="arm_cm" name="arm_cm" type="number" step="0.1" min="0" inputMode="decimal" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="thigh_cm">Thigh</label>
              <input id="thigh_cm" name="thigh_cm" type="number" step="0.1" min="0" inputMode="decimal" className="input" />
            </div>
          </div>
        </section>

        <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
          <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-4">
            Photos
          </h2>
          <p className="text-[var(--color-muted)] text-xs mb-4">
            Front, side, back. Same lighting + same time of day if you can. Only you and your coach see these.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <PhotoField id="photo_front" label="Front" />
            <PhotoField id="photo_side" label="Side" />
            <PhotoField id="photo_back" label="Back" />
          </div>
        </section>

        <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
          <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-4">
            Notes
          </h2>
          <textarea
            name="notes"
            rows={3}
            placeholder="How does the week feel? Anything weird? Wins?"
            className="input resize-y"
          />
        </section>

        {params.error ? (
          <div className="text-sm text-[var(--color-danger)] text-center">
            Could not save. Try again.
          </div>
        ) : null}

        <div className="flex gap-3">
          <Link href="/client/logbook" className="btn btn-ghost flex-1 text-center">Cancel</Link>
          <button type="submit" className="btn btn-primary flex-1">Save entry</button>
        </div>
      </form>
    </main>
  );
}

function PhotoField({ id, label }: { id: string; label: string }) {
  return (
    <div className="border-2 border-dashed border-[var(--color-line-strong)] rounded-xl p-4 text-center">
      <label htmlFor={id} className="cursor-pointer block">
        <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">{label}</div>
        <div className="text-xs text-[var(--color-muted)]">Tap to choose</div>
        <input id={id} name={id} type="file" accept="image/*" capture="environment" className="hidden" />
      </label>
    </div>
  );
}
