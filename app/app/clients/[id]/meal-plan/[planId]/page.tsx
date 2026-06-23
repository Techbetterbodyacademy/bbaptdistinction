import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/meal-plan/storage";
import { PlanReadOnly } from "@/components/meal-plan/plan-read-only";
import { Plan } from "@/lib/meal-plan/schema";

type PageProps = { params: Promise<{ id: string; planId: string }> };

export default async function MealPlanReadOnlyPage({ params }: PageProps) {
  const { id: clientId, planId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const row = await getPlan(supabase as never, planId);
  if (!row) redirect(`/app/clients/${clientId}/meal-plan`);

  if (row.status !== "ready") {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-sm text-[var(--color-warn)]">
          This plan is {row.status}. {row.error ?? ""}
        </p>
      </main>
    );
  }

  const parsed = Plan.safeParse(row.plan_json);
  if (!parsed.success) {
    return <main className="max-w-3xl mx-auto px-6 py-10 text-sm text-[var(--color-warn)]">Stored plan is malformed.</main>;
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <PlanReadOnly plan={parsed.data} />
    </main>
  );
}
