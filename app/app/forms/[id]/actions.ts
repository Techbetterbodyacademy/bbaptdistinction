"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prepareQuestionInput, type QuestionKind } from "@/lib/forms";

export async function addQuestion(formData: FormData) {
  const formId = String(formData.get("form_id") ?? "");
  const label = String(formData.get("label") ?? "");
  const kind = String(formData.get("kind") ?? "text") as QuestionKind;
  const required = formData.get("required") === "on";
  const order_index = Number(formData.get("order_index") ?? 0);
  const rawOptions = String(formData.get("options") ?? "").trim();
  const options = rawOptions.length ? rawOptions.split(",").map((o) => o.trim()).filter(Boolean) : undefined;

  const prepared = prepareQuestionInput({ label, kind, required, order_index, options });
  if (!prepared.ok) redirect(`/app/forms/${formId}?error=${encodeURIComponent(prepared.error)}`);

  const supabase = await createClient();
  await supabase.from("form_question").insert({
    form_id: formId,
    label: prepared.record.label,
    kind: prepared.record.kind,
    required: prepared.record.required,
    order_index: prepared.record.order_index,
    options: prepared.record.options
  });

  revalidatePath(`/app/forms/${formId}`);
  redirect(`/app/forms/${formId}`);
}

export async function deleteQuestion(formData: FormData) {
  const formId = String(formData.get("form_id") ?? "");
  const questionId = String(formData.get("question_id") ?? "");
  if (!formId || !questionId) redirect("/app/forms");

  const supabase = await createClient();
  await supabase.from("form_question").delete().eq("id", questionId);
  revalidatePath(`/app/forms/${formId}`);
  redirect(`/app/forms/${formId}`);
}

export async function deleteForm(formData: FormData) {
  const formId = String(formData.get("form_id") ?? "");
  if (!formId) redirect("/app/forms");

  const supabase = await createClient();
  await supabase.from("form").delete().eq("id", formId);
  revalidatePath("/app/forms");
  redirect("/app/forms");
}
