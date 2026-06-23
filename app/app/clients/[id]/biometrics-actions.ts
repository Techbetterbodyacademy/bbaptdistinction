"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const VALID_SEXES = ["male", "female", "neutral"] as const;
type Sex = (typeof VALID_SEXES)[number];

function parseOptInt(raw: FormDataEntryValue | null, min: number, max: number): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return Math.round(n);
}

function parseOptNumber(raw: FormDataEntryValue | null, min: number, max: number): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

export async function updateBiometrics(formData: FormData): Promise<void> {
  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) {
    redirect("/app/clients?error=biometrics_no_id");
  }

  const age = parseOptInt(formData.get("age"), 16, 99);
  const heightCm = parseOptNumber(formData.get("height_cm"), 120, 230);
  const currentWeightKg = parseOptNumber(formData.get("current_weight_kg"), 35, 250);
  const sexRaw = String(formData.get("sex") ?? "neutral");
  const sex: Sex = (VALID_SEXES as readonly string[]).includes(sexRaw) ? (sexRaw as Sex) : "neutral";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify workspace ownership through the client_profile + workspace chain.
  const { data: row } = await supabase
    .from("client_profile")
    .select("id, workspace_id")
    .eq("id", clientId)
    .maybeSingle();

  if (!row) {
    redirect(`/app/clients/${clientId}?error=biometrics_not_found`);
  }

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .eq("id", row.workspace_id)
    .maybeSingle();

  if (!workspace) {
    redirect(`/app/clients/${clientId}?error=forbidden`);
  }

  const { error } = await supabase
    .from("client_profile")
    .update({
      age,
      height_cm: heightCm,
      current_weight_kg: currentWeightKg,
      sex
    })
    .eq("id", clientId);

  if (error) {
    console.error("[updateBiometrics] update failed", error.message);
    redirect(`/app/clients/${clientId}?error=biometrics_update_failed`);
  }

  revalidatePath(`/app/clients/${clientId}`);
  revalidatePath(`/app/clients/${clientId}/meal-plan`);
  redirect(`/app/clients/${clientId}?biometrics=1`);
}
