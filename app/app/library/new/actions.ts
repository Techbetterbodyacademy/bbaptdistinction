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

export async function createExercise(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const muscles = parseMuscles(String(formData.get("primary_muscles") ?? ""));
  const videoUrl = String(formData.get("video_url") ?? "").trim() || null;
  const defaultUnit = String(formData.get("default_unit") ?? "kg");

  if (!name) {
    redirect("/app/library/new?error=missing");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  const { error } = await supabase.from("exercise").insert({
    workspace_id: workspace!.id,
    name,
    category,
    primary_muscles: muscles,
    video_url: videoUrl,
    default_unit: defaultUnit
  });

  if (error) {
    redirect("/app/library/new?error=insert");
  }

  revalidatePath("/app/library");
  redirect("/app/library");
}
