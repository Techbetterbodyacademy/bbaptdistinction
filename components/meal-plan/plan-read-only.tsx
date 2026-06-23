import type { Plan } from "@/lib/meal-plan/schema";

const DAY_NUMERAL = ["01", "02", "03", "04", "05", "06", "07"];

export function PlanReadOnly({ plan }: { plan: Plan }) {
  return (
    <div className="space-y-8">
      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-blue-glow)] font-bold mb-2">Coach note</div>
        <p className="text-base leading-relaxed">{plan.coachNote}</p>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-4">7-day plan</h2>
        <div className="space-y-4">
          {plan.days.map((d, i) => (
            <article key={d.day} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 relative overflow-hidden">
              <div className="text-6xl font-extrabold absolute top-2 right-5 text-[var(--color-blue-glow)] opacity-10" style={{ fontFamily: "var(--font-serif)" }}>{DAY_NUMERAL[i]}</div>
              <div className="relative">
                <div className="font-bold text-xl mb-1">{d.day}</div>
                <div className="text-xs text-[var(--color-subtle)] mb-4">{d.totals.calories} kcal . {d.totals.proteinG}g P . {d.totals.carbsG}g C . {d.totals.fatG}g F</div>
                <ul className="space-y-3">
                  {d.meals.map((m, mi) => (
                    <li key={mi} className="border-t border-[var(--color-line)] pt-3 first:border-t-0 first:pt-0">
                      <div className="font-bold">{m.name}</div>
                      <div className="text-xs text-[var(--color-subtle)] mt-0.5">{m.calories} kcal . {m.proteinG}g P . {m.carbsG}g C . {m.fatG}g F</div>
                      <div className="text-sm text-[var(--color-muted)] mt-2">{m.ingredients.join(", ")}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <details className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl group">
        <summary className="cursor-pointer p-5 font-bold flex items-center justify-between list-none">
          <span>Shopping list</span>
          <span className="text-[var(--color-blue-glow)] group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
        </summary>
        <div className="px-5 pb-5 grid grid-cols-2 md:grid-cols-3 gap-5 text-sm">
          {(["produce", "proteins", "grainsCarbs", "dairyEggs", "pantry", "other"] as const).map((k) => (
            plan.shoppingList[k].length > 0 && (
              <div key={k}>
                <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">{k}</div>
                <ul className="space-y-1 text-[var(--color-muted)]">
                  {plan.shoppingList[k].map((item, idx) => <li key={idx}>{item}</li>)}
                </ul>
              </div>
            )
          ))}
        </div>
      </details>
    </div>
  );
}
