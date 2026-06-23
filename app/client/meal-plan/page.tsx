import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listPlansForClient } from "@/lib/meal-plan/storage";
import { PlanReadOnly } from "@/components/meal-plan/plan-read-only";
import { Plan } from "@/lib/meal-plan/schema";

export default async function ClientMealPlanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const plans = await listPlansForClient(supabase as never, user.id);

  if (plans.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-extrabold mb-3">Meal plan</h1>
        <p className="text-sm text-[var(--color-muted)]">Your coach has not generated a plan for you yet. Hang tight, or message them.</p>
      </main>
    );
  }

  const latest = plans[0];
  const parsed = Plan.safeParse(latest.plan_json);

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Meal plan</div>
          <h1 className="text-2xl font-extrabold mt-1">
            Plan for {new Date(latest.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
          </h1>
        </div>
        {plans.length > 1 && (
          <details className="relative">
            <summary className="text-sm text-[var(--color-blue-glow)] cursor-pointer list-none">Older plans ({plans.length - 1})</summary>
            <ul className="absolute right-0 mt-2 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-2 min-w-[220px] z-10">
              {plans.slice(1).map((p) => (
                <li key={p.id}>
                  <Link href={`/client/meal-plan/${p.id}`} className="block px-3 py-2 text-sm hover:bg-[rgba(255,255,255,0.04)] rounded-lg">
                    {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </header>

      {parsed.success
        ? <PlanReadOnly plan={parsed.data} />
        : <p className="text-sm text-[var(--color-warn)]">Stored plan is malformed.</p>}
    </main>
  );
}
