"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function parseMuscles(input: string): string[] | null {
  const cleaned = input
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return cleaned.length ? cleaned : null;
}

export async function updateExercise(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const muscles = parseMuscles(String(formData.get("primary_muscles") ?? ""));
  const videoUrl = String(formData.get("video_url") ?? "").trim() || null;
  const defaultUnit = String(formData.get("default_unit") ?? "kg");

  if (!id || !name) {
    redirect(`/app/library/${id}/edit?error=missing`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("exercise")
    .update({
      name,
      category,
      primary_muscles: muscles,
      video_url: videoUrl,
      default_unit: defaultUnit
    })
    .eq("id", id);

  if (error) {
    redirect(`/app/library/${id}/edit?error=update`);
  }

  revalidatePath("/app/library");
  redirect(`/app/library/${id}/edit?saved=1`);
}

export async function deleteExercise(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect("/app/library");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("exercise").delete().eq("id", id);

  if (error) {
    redirect(`/app/library/${id}/edit?error=delete`);
  }

  revalidatePath("/app/library");
  redirect("/app/library");
}
