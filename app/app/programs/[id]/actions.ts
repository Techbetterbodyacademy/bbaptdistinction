"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProgram(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const weeks = Math.max(1, Math.min(52, Number(formData.get("weeks") ?? 12) || 12));
  const audience = String(formData.get("audience") ?? "mixed");

  if (!id || !name) {
    redirect(`/app/programs/${id}?error=missing`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("program")
    .update({ name, description, weeks, audience })
    .eq("id", id);

  if (error) {
    redirect(`/app/programs/${id}?error=update`);
  }

  revalidatePath(`/app/programs/${id}`);
  revalidatePath("/app/programs");
  redirect(`/app/programs/${id}?saved=1`);
}

export async function setProgramStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["draft", "published", "archived"].includes(status)) {
    redirect(`/app/programs/${id}?error=status`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("program")
    .update({ status })
    .eq("id", id);

  if (error) {
    redirect(`/app/programs/${id}?error=status`);
  }

  revalidatePath(`/app/programs/${id}`);
  revalidatePath("/app/programs");
  redirect(`/app/programs/${id}?saved=1`);
}

export async function addWorkout(formData: FormData) {
  const programId = String(formData.get("program_id") ?? "");
  const weekNumber = Number(formData.get("week_number") ?? 0);
  const dayNumber = Number(formData.get("day_number") ?? 0);

  if (!programId || !weekNumber || !dayNumber) {
    redirect(`/app/programs/${programId}?error=slot`);
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("workout")
    .insert({
      program_id: programId,
      week_number: weekNumber,
      day_number: dayNumber,
      name: `Week ${weekNumber} · Day ${dayNumber}`,
      order_index: dayNumber
    })
    .select("id")
    .single();

  if (error || !created) {
    redirect(`/app/programs/${programId}?error=workout`);
  }

  revalidatePath(`/app/programs/${programId}`);
  redirect(`/app/programs/${programId}/workouts/${created.id}`);
}

export async function deleteProgram(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect("/app/programs");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("program").delete().eq("id", id);

  if (error) {
    redirect(`/app/programs/${id}?error=delete`);
  }

  revalidatePath("/app/programs");
  redirect("/app/programs");
}
