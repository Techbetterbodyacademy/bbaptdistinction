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

export async function updateHabit(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/app/habits");

  const supabase = await createClient();
  const { error } = await supabase
    .from("habit")
    .update({
      name: strOrNull(formData.get("name")),
      description: strOrNull(formData.get("description")),
      category: strOrNull(formData.get("category")),
      default_frequency: String(formData.get("default_frequency") ?? "daily"),
      default_target_value: numOrNull(formData.get("default_target_value")),
      default_target_unit: strOrNull(formData.get("default_target_unit"))
    })
    .eq("id", id);

  if (error) redirect(`/app/habits/${id}/edit?error=1`);

  revalidatePath("/app/habits");
  redirect(`/app/habits/${id}/edit?saved=1`);
}

export async function deleteHabit(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/app/habits");

  const supabase = await createClient();
  await supabase.from("habit").delete().eq("id", id);

  revalidatePath("/app/habits");
  redirect("/app/habits");
}
