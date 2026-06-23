import Link from "next/link";
import type { MealPlanRow } from "@/lib/meal-plan/storage";

export function HistoryList({
  plans,
  failedPlans = [],
  clientId
}: {
  plans: MealPlanRow[];
  failedPlans?: MealPlanRow[];
  clientId: string;
}) {
  if (plans.length === 0 && failedPlans.length === 0) {
    return (
      <section>
        <h2 className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-3">History</h2>
        <p className="text-sm text-[var(--color-muted)]">No plans yet. Generate one above.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-3">History</h2>
      {plans.length > 0 && (
        <ul className="space-y-2">
          {plans.map((p) => {
            const date = new Date(p.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
            const status = p.status === "ready" ? null : (
              <span className="text-[10px] uppercase tracking-[1.5px] font-bold text-[var(--color-warn)] ml-2">{p.status}</span>
            );
            return (
              <li key={p.id}>
                <Link
                  href={`/app/clients/${clientId}/meal-plan/${p.id}`}
                  className="block bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl px-5 py-4 hover:border-[var(--color-blue)] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold">{date}{status}</div>
                      <div className="text-xs text-[var(--color-muted)] mt-1">
                        {p.intake_json.calories} kcal . {p.intake_json.proteinG}g protein . goal: {p.intake_json.goal}
                      </div>
                    </div>
                    <span className="text-[var(--color-blue-glow)]">View</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {failedPlans.length > 0 && (
        <details className="mt-6 bg-[var(--color-surface)] border border-[var(--color-warn)] rounded-xl">
          <summary className="cursor-pointer px-5 py-3 text-xs uppercase tracking-[1.5px] text-[var(--color-warn)] font-bold list-none flex items-center justify-between">
            <span>Show failed ({failedPlans.length})</span>
            <span className="text-lg leading-none">+</span>
          </summary>
          <ul className="px-5 pb-5 pt-2 space-y-2 border-t border-[var(--color-line)]">
            {failedPlans.map((p) => {
              const date = new Date(p.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
              return (
                <li key={p.id} className="text-sm">
                  <div className="font-bold">{date}</div>
                  <div className="text-xs text-[var(--color-muted)] mt-1">
                    {p.intake_json.calories} kcal . goal: {p.intake_json.goal}
                  </div>
                  <div className="text-xs text-[var(--color-warn)] mt-1">
                    Error: {p.error ?? "Unknown error"}
                  </div>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
}
