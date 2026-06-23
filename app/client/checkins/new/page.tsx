import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { submitCheckin } from "./actions";

export default async function NewCheckinPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clientProfile } = await supabase
    .from("client_profile")
    .select("id, current_weight_kg")
    .eq("user_id", user!.id)
    .maybeSingle();

  const { data: assignment } = clientProfile
    ? await supabase
        .from("program_assignment")
        .select("start_date")
        .eq("client_id", clientProfile.id)
        .eq("status", "active")
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const startDate = assignment?.start_date ? new Date(assignment.start_date) : null;
  const weekNumber = startDate
    ? Math.max(1, Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1)
    : 1;

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/client/checkins" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Back to check-ins
      </Link>

      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          New check-in
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">How was the week?</h1>
        <p className="text-[var(--color-muted)] mt-2">
          Honest reflection beats perfect data. Skip what doesn&rsquo;t apply.
        </p>
      </header>

      <form action={submitCheckin} className="space-y-5">
        <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
          <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-4">
            The numbers
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="week_number">Week #</label>
              <input id="week_number" name="week_number" type="number" min="1" defaultValue={weekNumber} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="weight_kg">Weight (kg)</label>
              <input
                id="weight_kg"
                name="weight_kg"
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                defaultValue={clientProfile?.current_weight_kg ?? ""}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="sleep_hours_avg">Avg sleep (hrs)</label>
              <input id="sleep_hours_avg" name="sleep_hours_avg" type="number" step="0.1" min="0" max="24" inputMode="decimal" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="stress_rating">Stress (1-10)</label>
              <input id="stress_rating" name="stress_rating" type="number" min="1" max="10" inputMode="numeric" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="adherence_pct">Adherence to plan (%)</label>
              <input id="adherence_pct" name="adherence_pct" type="number" min="0" max="100" inputMode="numeric" placeholder="80" className="input" />
              <p className="text-[var(--color-subtle)] text-xs mt-2">Roughly what % of planned workouts + meals did you actually hit?</p>
            </div>
          </div>
        </section>

        <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
          <label className="label" htmlFor="wins">Wins this week</label>
          <textarea
            id="wins"
            name="wins"
            rows={3}
            placeholder="Hit a PR on squats. Didn't snack at night. Walked every day."
            className="input resize-y"
          />
        </section>

        <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
          <label className="label" htmlFor="struggles">Struggles</label>
          <textarea
            id="struggles"
            name="struggles"
            rows={3}
            placeholder="Sunday dinner went sideways. Knees hurt on deadlifts. Lost sleep Wed-Thu."
            className="input resize-y"
          />
        </section>

        {params.error ? (
          <div className="text-sm text-[var(--color-danger)] text-center">
            Could not submit. Try again.
          </div>
        ) : null}

        <div className="flex gap-3">
          <Link href="/client/checkins" className="btn btn-ghost flex-1 text-center">Cancel</Link>
          <button type="submit" className="btn btn-primary flex-1">Submit check-in</button>
        </div>
      </form>
    </main>
  );
}
