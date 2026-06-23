"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prepareTemplateItemInput } from "@/lib/assessment-template";

export async function addItem(formData: FormData) {
  const templateId = String(formData.get("template_id") ?? "");
  const label = String(formData.get("label") ?? "");
  const unit = String(formData.get("unit") ?? "");
  const targetRaw = String(formData.get("target_value") ?? "");
  const target_value = targetRaw.trim() ? Number(targetRaw) : undefined;
  const order_index = Number(formData.get("order_index") ?? 0);

  const prepared = prepareTemplateItemInput({ label, unit: unit || undefined, target_value, order_index });
  if (!prepared.ok) redirect(`/app/assessments/${templateId}?error=${encodeURIComponent(prepared.error)}`);

  const supabase = await createClient();
  await supabase.from("assessment_template_item").insert({
    template_id: templateId,
    label: prepared.record.label,
    unit: prepared.record.unit,
    target_value: prepared.record.target_value,
    order_index: prepared.record.order_index
  });

  revalidatePath(`/app/assessments/${templateId}`);
  redirect(`/app/assessments/${templateId}`);
}

export async function removeItem(formData: FormData) {
  const templateId = String(formData.get("template_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  if (!templateId || !itemId) redirect("/app/assessments");

  const supabase = await createClient();
  await supabase.from("assessment_template_item").delete().eq("id", itemId);
  revalidatePath(`/app/assessments/${templateId}`);
  redirect(`/app/assessments/${templateId}`);
}

export async function deleteTemplate(formData: FormData) {
  const templateId = String(formData.get("template_id") ?? "");
  if (!templateId) redirect("/app/assessments");

  const supabase = await createClient();
  await supabase.from("assessment_template").delete().eq("id", templateId);
  revalidatePath("/app/assessments");
  redirect("/app/assessments");
}
