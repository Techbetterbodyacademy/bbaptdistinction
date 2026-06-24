"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { computeMacros, type Sex } from "@/lib/meal-plan/mifflin";
import { Plan } from "@/lib/meal-plan/schema";
import { PlanReadOnly } from "./plan-read-only";

type Props = {
  clientId: string;
  prefill: { age: number; heightCm: number; weightKg: number; sex: Sex };
};

const CUISINES = ["italian", "asian", "mediterranean", "mexican", "american"] as const;

export function GenerateForm({ clientId, prefill }: Props) {
  const router = useRouter();
  const [goal, setGoal] = useState<"cut" | "maintain" | "gain">("maintain");
  const [activity, setActivity] = useState<"sedentary" | "light" | "moderate" | "active" | "athlete">("moderate");
  const [mealsPerDay, setMealsPerDay] = useState(4);
  const [fastBreakfast, setFastBreakfast] = useState(false);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [allergies, setAllergies] = useState("");
  const [trainingDays, setTrainingDays] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);

  const autoMacros = useMemo(() => {
    if (!prefill.age || !prefill.heightCm || !prefill.weightKg) return null;
    return computeMacros({ ...prefill, activity, goal });
  }, [prefill, activity, goal]);

  const [caloriesOverride, setCaloriesOverride] = useState<number | "">("");
  const [proteinOverride, setProteinOverride] = useState<number | "">("");

  const finalCalories = caloriesOverride === "" ? autoMacros?.calories : caloriesOverride;
  const finalProtein = proteinOverride === "" ? autoMacros?.proteinG : proteinOverride;

  const ready = autoMacros !== null;

  const { object, submit: streamSubmit, isLoading } = useObject({
    api: "/api/meal-plan/generate",
    schema: Plan,
    onFinish: ({ error: e }) => {
      setSubmitting(false);
      setStreaming(false);
      if (!e) {
        router.refresh();
      }
    }
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || finalCalories == null || finalProtein == null) {
      setError("This client is missing biometrics (age, height, weight). Add them on the client profile first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setStreaming(true);

    streamSubmit({
      clientId,
      intake: {
        age: prefill.age, heightCm: prefill.heightCm, weightKg: prefill.weightKg, sex: prefill.sex,
        activity, goal,
        calories: finalCalories, proteinG: finalProtein,
        mealsPerDay, fastBreakfast, cuisines, allergies,
        dietStyle: "omnivore", trainingDays
      }
    });
  }

  function toggleCuisine(c: string) {
    setCuisines((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  }

  return (
    <>
      <form onSubmit={onSubmit} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">Generate a 7-day plan</h2>
          {ready ? (
            <p className="text-sm text-[var(--color-muted)]">
              Auto-calc from biometrics: <strong className="text-[var(--color-blue-glow)]">{autoMacros?.calories} kcal . {autoMacros?.proteinG}g protein</strong>. Override below if needed.
            </p>
          ) : (
            <p className="text-sm text-[var(--color-warn)]">
              This client is missing biometrics. Add age, height, weight on the client profile to enable auto-calc.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Goal</span>
            <select value={goal} onChange={(e) => setGoal(e.target.value as never)} className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm">
              <option value="cut">Cut</option>
              <option value="maintain">Maintain</option>
              <option value="gain">Gain</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Activity</span>
            <select value={activity} onChange={(e) => setActivity(e.target.value as never)} className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm">
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
              <option value="athlete">Athlete</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Calories (override)</span>
            <input
              type="number"
              placeholder={autoMacros ? String(autoMacros.calories) : ""}
              value={caloriesOverride}
              onChange={(e) => setCaloriesOverride(e.target.value === "" ? "" : Number(e.target.value))}
              className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Protein g (override)</span>
            <input
              type="number"
              placeholder={autoMacros ? String(autoMacros.proteinG) : ""}
              value={proteinOverride}
              onChange={(e) => setProteinOverride(e.target.value === "" ? "" : Number(e.target.value))}
              className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Meals per day</span>
            <input type="number" min={3} max={6} value={mealsPerDay} onChange={(e) => setMealsPerDay(Number(e.target.value))} className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Training days / week</span>
            <input type="number" min={0} max={7} value={trainingDays} onChange={(e) => setTrainingDays(Number(e.target.value))} className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={fastBreakfast} onChange={(e) => setFastBreakfast(e.target.checked)} />
          Member fasts breakfast (first meal is lunch)
        </label>

        <div>
          <span className="block text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">Preferred cuisines</span>
          <div className="flex flex-wrap gap-2">
            {CUISINES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCuisine(c)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${cuisines.includes(c) ? "border-[var(--color-blue)] bg-[rgba(0,174,239,0.1)] text-[var(--color-blue-glow)]" : "border-[var(--color-line)] text-[var(--color-muted)]"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Allergies + dislikes</span>
          <input
            type="text"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="e.g. shellfish, tree nuts"
            className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
          />
        </label>

        {error && <div className="text-sm text-[var(--color-warn)]">{error}</div>}

        <button type="submit" disabled={!ready || submitting || isLoading} className="btn btn-primary text-sm disabled:opacity-50">
          {isLoading ? "Generating..." : "Generate plan"}
        </button>
      </form>

      {streaming && object && Plan.safeParse(object).success && (
        <div className="mt-6"><PlanReadOnly plan={object as never} /></div>
      )}
      {streaming && !isLoading && (
        <div className="mt-4 text-sm text-[var(--color-blue-glow)]">Plan saved. Refreshing history...</div>
      )}
    </>
  );
}
