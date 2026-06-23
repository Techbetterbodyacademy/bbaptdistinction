import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { submitForm } from "./actions";
import type { FormQuestion } from "@/lib/forms";

export default async function PublicFormPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: form } = await supabase.from("form").select("id, title, description").eq("id", id).maybeSingle();
  if (!form) notFound();

  const { data: questions } = await supabase
    .from("form_question")
    .select("id, label, kind, required, order_index, options")
    .eq("form_id", form.id)
    .order("order_index");

  if (sp.submitted === "1") {
    return (
      <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-6">✓</div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-3">Thanks for your response</h1>
          <p className="text-[var(--color-muted)]">Your coach will reach out shortly.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">{form.title}</h1>
          {form.description ? <p className="text-[var(--color-muted)]">{form.description}</p> : null}
        </header>

        {sp.error ? (
          <div className="mb-6 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm">{sp.error}</div>
        ) : null}

        <form action={submitForm} className="space-y-6">
          <input type="hidden" name="form_id" value={form.id} />
          {(questions ?? []).map((q, idx) => {
            const fq = q as unknown as FormQuestion;
            return (
              <div key={q.id} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
                <label className="block mb-3">
                  <span className="block text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-1">Question {idx + 1}</span>
                  <span className="block font-semibold">
                    {q.label} {q.required ? <span className="text-[var(--color-blue-glow)]">*</span> : null}
                  </span>
                </label>
                <QuestionField question={fq} />
              </div>
            );
          })}

          <button type="submit" className="btn btn-primary w-full sm:w-auto">Submit</button>
        </form>
      </div>
    </main>
  );
}

function QuestionField({ question }: { question: FormQuestion }) {
  const name = `q_${question.id}`;
  switch (question.kind) {
    case "long_text":
      return <textarea name={name} required={question.required} rows={4} className="input resize-y" />;
    case "email":
      return <input type="email" name={name} required={question.required} className="input" />;
    case "number":
      return <input type="number" name={name} required={question.required} className="input" />;
    case "choice":
      return (
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name={name} value={opt} required={question.required} />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      );
    case "yes_no":
      return (
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name={name} value="yes" required={question.required} /> Yes
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name={name} value="no" required={question.required} /> No
          </label>
        </div>
      );
    case "text":
    default:
      return <input type="text" name={name} required={question.required} className="input" />;
  }
}
