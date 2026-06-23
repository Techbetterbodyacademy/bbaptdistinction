"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prepareMeasurementInput } from "@/lib/results";

export async function recordMeasurement(formData: FormData) {
  const metricId = String(formData.get("metric_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const value = Number(formData.get("value") ?? NaN);
  const recordedAtRaw = String(formData.get("recorded_at") ?? "");

  const recorded_at = recordedAtRaw ? new Date(recordedAtRaw).toISOString() : new Date().toISOString();

  const prepared = prepareMeasurementInput({ value, recorded_at });
  if (!prepared.ok) {
    redirect(`/app/clients/${clientId}/results?error=${encodeURIComponent(prepared.error)}`);
  }

  const supabase = await createClient();
  await supabase.from("client_measurement").insert({
    metric_id: metricId,
    client_id: clientId,
    value: prepared.record.value,
    recorded_at: prepared.record.recorded_at,
    notes: prepared.record.notes
  });

  revalidatePath(`/app/clients/${clientId}/results`);
  redirect(`/app/clients/${clientId}/results?saved=1`);
}

export async function deleteMeasurement(formData: FormData) {
  const measurementId = String(formData.get("measurement_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!measurementId || !clientId) redirect(`/app/clients/${clientId}/results`);

  const supabase = await createClient();
  await supabase.from("client_measurement").delete().eq("id", measurementId);
  revalidatePath(`/app/clients/${clientId}/results`);
  redirect(`/app/clients/${clientId}/results`);
}
