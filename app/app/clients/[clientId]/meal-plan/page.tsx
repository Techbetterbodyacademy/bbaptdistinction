import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listPlansForCoach } from "@/lib/meal-plan/storage";
import { GenerateForm } from "@/components/meal-plan/generate-form";
import { HistoryList } from "@/components/meal-plan/history-list";

type PageProps = { params: Promise<{ clientId: string }> };

export default async function MealPlanCoachPage({ params }: PageProps) {
  const { clientId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: client } = await supabase
    .from("user_profile")
    .select("id, full_name, age, height_cm, current_weight_kg, sex, workspace_id")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) redirect("/app/clients");

  const plans = await listPlansForCoach(supabase as never, clientId);

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
      <header>
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Meal plan</div>
        <h1 className="text-3xl font-extrabold tracking-tight mt-1">{client.full_name}</h1>
      </header>

      <GenerateForm
        clientId={client.id}
        prefill={{
          age: client.age ?? 0,
          heightCm: client.height_cm ?? 0,
          weightKg: client.current_weight_kg ?? 0,
          sex: (client.sex as "male" | "female" | "neutral") ?? "neutral"
        }}
      />

      <HistoryList plans={plans} clientId={clientId} />
    </main>
  );
}
