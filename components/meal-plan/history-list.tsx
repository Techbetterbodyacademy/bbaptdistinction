import Link from "next/link";
import type { MealPlanRow } from "@/lib/meal-plan/storage";

export function HistoryList({ plans, clientId }: { plans: MealPlanRow[]; clientId: string }) {
  if (plans.length === 0) {
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
    </section>
  );
}
