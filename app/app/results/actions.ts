"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prepareMetricInput, type MetricDirection } from "@/lib/results";

export async function createMetric(formData: FormData) {
  const input = {
    name: String(formData.get("name") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    direction: String(formData.get("direction") ?? "neutral") as MetricDirection
  };
  const prepared = prepareMetricInput(input);
  if (!prepared.ok) redirect(`/app/results?error=${encodeURIComponent(prepared.error)}`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  const { error } = await supabase.from("tracked_metric").insert({
    workspace_id: workspace!.id,
    ...prepared.record
  });

  if (error) {
    console.error("[metric] insert failed", error.message);
    redirect("/app/results?error=save");
  }

  revalidatePath("/app/results");
  redirect("/app/results?saved=1");
}

export async function deleteMetric(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/app/results");

  const supabase = await createClient();
  await supabase.from("tracked_metric").delete().eq("id", id);
  revalidatePath("/app/results");
  redirect("/app/results");
}
