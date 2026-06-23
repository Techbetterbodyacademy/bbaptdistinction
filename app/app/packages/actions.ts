"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prepareCoachingPackage, type PackageInterval } from "@/lib/packages";

export async function createPackage(formData: FormData) {
  const priceUnits = Number(formData.get("price") ?? 0);
  const price_cents = Math.round(priceUnits * 100);

  const prepared = prepareCoachingPackage({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    price_cents,
    currency: String(formData.get("currency") ?? "usd"),
    interval: String(formData.get("interval") ?? "one_time") as PackageInterval
  });

  if (!prepared.ok) redirect(`/app/packages?error=${encodeURIComponent(prepared.error)}`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  const { error } = await supabase.from("coaching_package").insert({
    workspace_id: workspace!.id,
    ...prepared.record
  });

  if (error) {
    console.error("[package] insert failed", { message: error.message, code: error.code });
    redirect("/app/packages?error=save");
  }

  revalidatePath("/app/packages");
  redirect("/app/packages?saved=1");
}

export async function togglePackage(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const enabled = String(formData.get("enabled") ?? "false") === "true";
  if (!id) redirect("/app/packages");

  const supabase = await createClient();
  await supabase.from("coaching_package").update({ enabled }).eq("id", id);
  revalidatePath("/app/packages");
  redirect("/app/packages");
}

export async function deletePackage(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/app/packages");

  const supabase = await createClient();
  await supabase.from("coaching_package").delete().eq("id", id);
  revalidatePath("/app/packages");
  redirect("/app/packages");
}
