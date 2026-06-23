import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listPlansForCoach } from "@/lib/meal-plan/storage";
import { GenerateForm } from "@/components/meal-plan/generate-form";
import { HistoryList } from "@/components/meal-plan/history-list";

type PageProps = { params: Promise<{ id: string }> };

export default async function MealPlanCoachPage({ params }: PageProps) {
  const { id: clientId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // The route param is the client_profile.id. Biometrics live on client_profile,
  // but the meal_plan.client_id FK references user_profile.id, so we need to fetch
  // both: the biometrics + the user_profile id for the API call.
  const { data: client } = await supabase
    .from("client_profile")
    .select("id, user_id, age, height_cm, current_weight_kg, sex, workspace_id, user_profile:user_id(full_name)")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) redirect("/app/clients");

  // user_profile is returned as an array even for to-one joins in some Supabase versions
  const userProfile = Array.isArray(client.user_profile) ? client.user_profile[0] : client.user_profile;
  const fullName = userProfile?.full_name ?? "Client";

  const allPlans = await listPlansForCoach(supabase as never, client.user_id, { includeFailed: true });
  const readyPlans = allPlans.filter((p) => p.status !== "failed");
  const failedPlans = allPlans.filter((p) => p.status === "failed");

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
      <header>
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Meal plan</div>
        <h1 className="text-3xl font-extrabold tracking-tight mt-1">{fullName}</h1>
      </header>

      <GenerateForm
        clientId={client.user_id}
        prefill={{
          age: client.age ?? 0,
          heightCm: client.height_cm ?? 0,
          weightKg: client.current_weight_kg ?? 0,
          sex: (client.sex as "male" | "female" | "neutral") ?? "neutral"
        }}
      />

      <HistoryList plans={readyPlans} failedPlans={failedPlans} clientId={client.user_id} />
    </main>
  );
}
