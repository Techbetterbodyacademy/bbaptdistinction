"use server";

import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { validateResponse, type FormQuestion } from "@/lib/forms";

export async function submitForm(formData: FormData) {
  const formId = String(formData.get("form_id") ?? "");
  if (!formId) redirect("/");

  const supabase = createServiceClient();

  const { data: form } = await supabase
    .from("form")
    .select("id, workspace_id")
    .eq("id", formId)
    .maybeSingle();
  if (!form) redirect(`/f/${formId}?error=form-not-found`);

  const { data: questions } = await supabase
    .from("form_question")
    .select("id, label, kind, required, order_index, options")
    .eq("form_id", form.id)
    .order("order_index");

  const fqs = (questions ?? []) as unknown as FormQuestion[];

  const answers: Record<string, string> = {};
  for (const q of fqs) {
    answers[q.id] = String(formData.get(`q_${q.id}`) ?? "");
  }

  const result = validateResponse(fqs, answers);
  if (!result.ok) {
    const first = Object.values(result.errors)[0] ?? "validation failed";
    redirect(`/f/${formId}?error=${encodeURIComponent(first)}`);
  }

  const labeledAnswers: Record<string, string> = {};
  for (const q of fqs) {
    labeledAnswers[q.label] = answers[q.id];
  }

  const possibleEmail = Object.values(answers).find((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));

  await supabase.from("form_response").insert({
    form_id: form.id,
    buyer_email: possibleEmail ?? null,
    answers: labeledAnswers
  });

  redirect(`/f/${formId}?submitted=1`);
}
