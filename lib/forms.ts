export type FormInput = {
  title: string;
  description?: string;
};

export type FormRecord = {
  title: string;
  description: string | null;
};

export const QUESTION_KINDS = ["text", "long_text", "email", "number", "choice", "yes_no"] as const;
export type QuestionKind = typeof QUESTION_KINDS[number];

export type QuestionInput = {
  label: string;
  kind: QuestionKind;
  required: boolean;
  order_index: number;
  options?: string[];
};

export type QuestionRecord = {
  label: string;
  kind: QuestionKind;
  required: boolean;
  order_index: number;
  options: string[] | null;
};

export type FormQuestion = QuestionRecord & { id: string };

export type PrepareResult<T> = { ok: true; record: T } | { ok: false; error: string };

export function prepareFormInput(input: FormInput): PrepareResult<FormRecord> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "title required" };
  const description = input.description?.trim() ?? "";
  return {
    ok: true,
    record: { title, description: description.length ? description : null }
  };
}

export function prepareQuestionInput(input: QuestionInput): PrepareResult<QuestionRecord> {
  const label = input.label.trim();
  if (!label) return { ok: false, error: "label required" };
  if (!QUESTION_KINDS.includes(input.kind)) {
    return { ok: false, error: "kind invalid" };
  }
  let options: string[] | null = null;
  if (input.kind === "choice") {
    if (!input.options || input.options.length === 0) {
      return { ok: false, error: "options required for choice questions" };
    }
    options = input.options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (options.length === 0) {
      return { ok: false, error: "options required for choice questions" };
    }
  }
  return {
    ok: true,
    record: { label, kind: input.kind, required: input.required, order_index: input.order_index, options }
  };
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateResponse(
  questions: FormQuestion[],
  answers: Record<string, string>
): ValidationResult {
  const errors: Record<string, string> = {};
  for (const q of questions) {
    const raw = answers[q.id] ?? "";
    const value = raw.trim();

    if (!value) {
      if (q.required) errors[q.id] = "required";
      continue;
    }

    switch (q.kind) {
      case "email":
        if (!EMAIL_RE.test(value)) errors[q.id] = "email invalid";
        break;
      case "number":
        if (!Number.isFinite(Number(value))) errors[q.id] = "number invalid";
        break;
      case "choice":
        if (!q.options || !q.options.includes(value)) errors[q.id] = "choice invalid";
        break;
      case "yes_no":
        if (!["yes", "no"].includes(value.toLowerCase())) errors[q.id] = "must be yes or no";
        break;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}
