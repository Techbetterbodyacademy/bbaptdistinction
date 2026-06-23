"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function numOrNull(value: FormDataEntryValue | null): number | null {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

function strOrNull(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}

export async function submitCheckin(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: clientProfile } = await supabase
    .from("client_profile")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!clientProfile) {
    redirect("/client");
  }

  const weightKg = numOrNull(formData.get("weight_kg"));

  const { data: created, error } = await supabase
    .from("check_in")
    .insert({
      client_id: clientProfile.id,
      week_number: numOrNull(formData.get("week_number")),
      weight_kg: weightKg,
      sleep_hours_avg: numOrNull(formData.get("sleep_hours_avg")),
      stress_rating: numOrNull(formData.get("stress_rating")),
      adherence_pct: numOrNull(formData.get("adherence_pct")),
      wins: strOrNull(formData.get("wins")),
      struggles: strOrNull(formData.get("struggles"))
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("[checkin] insert failed", { message: error?.message, code: error?.code });
    redirect("/client/checkins/new?error=insert");
  }

  if (weightKg) {
    await supabase
      .from("client_profile")
      .update({ current_weight_kg: weightKg })
      .eq("id", clientProfile.id);
  }

  revalidatePath("/client/checkins");
  redirect(`/client/checkins/${created.id}`);
}
