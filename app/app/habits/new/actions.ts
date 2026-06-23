"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function strOrNull(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}

function numOrNull(value: FormDataEntryValue | null): number | null {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

export async function createHabit(formData: FormData) {
  const name = strOrNull(formData.get("name"));
  if (!name) redirect("/app/habits/new?error=missing");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  const { error } = await supabase.from("habit").insert({
    workspace_id: workspace!.id,
    name,
    description: strOrNull(formData.get("description")),
    category: strOrNull(formData.get("category")),
    default_frequency: String(formData.get("default_frequency") ?? "daily"),
    default_target_value: numOrNull(formData.get("default_target_value")),
    default_target_unit: strOrNull(formData.get("default_target_unit")),
    created_by: user.id
  });

  if (error) {
    console.error("[habit] insert failed", { message: error.message, code: error.code });
    redirect("/app/habits/new?error=insert");
  }

  revalidatePath("/app/habits");
  redirect("/app/habits");
}
