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

export async function assignHabit(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const habitId = String(formData.get("habit_id") ?? "");
  if (!clientId || !habitId) redirect(`/app/clients/${clientId}/habits?error=missing`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("habit_assignment").insert({
    client_id: clientId,
    habit_id: habitId,
    frequency: String(formData.get("frequency") ?? "daily"),
    target_value: numOrNull(formData.get("target_value")),
    target_unit: strOrNull(formData.get("target_unit")),
    assigned_by: user.id
  });

  if (error) {
    console.error("[habit-assignment] insert failed", { message: error.message, code: error.code });
    redirect(`/app/clients/${clientId}/habits?error=insert`);
  }

  revalidatePath(`/app/clients/${clientId}/habits`);
  redirect(`/app/clients/${clientId}/habits?saved=1`);
}

export async function unassignHabit(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const assignmentId = String(formData.get("assignment_id") ?? "");
  if (!clientId || !assignmentId) redirect(`/app/clients/${clientId}/habits`);

  const supabase = await createClient();
  await supabase.from("habit_assignment").delete().eq("id", assignmentId);

  revalidatePath(`/app/clients/${clientId}/habits`);
  redirect(`/app/clients/${clientId}/habits?saved=1`);
}
