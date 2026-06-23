"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function normalizeHex(input: string): string {
  const trimmed = input.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#[0-9A-Fa-f]{6}$/.test(withHash) ? withHash.toUpperCase() : "#00AEEF";
}

function audienceToTag(value: string): "men-40-60" | "women-35-60" | "mixed" {
  if (value === "men") return "men-40-60";
  if (value === "women") return "women-35-60";
  return "mixed";
}

export async function updateWorkspace(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const coachName = String(formData.get("coach_name") ?? "").trim();
  const audience = String(formData.get("audience") ?? "men");
  const primaryColor = normalizeHex(String(formData.get("primary_color") ?? "#00AEEF"));

  if (!name || !coachName) {
    redirect("/app/settings/workspace?error=missing");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("workspace")
    .update({
      name,
      coach_name: coachName,
      brand_audience: audienceToTag(audience),
      primary_color: primaryColor
    })
    .eq("owner_id", user.id);

  if (error) {
    redirect("/app/settings/workspace?error=save");
  }

  revalidatePath("/app", "layout");
  redirect("/app/settings/workspace?saved=1");
}
