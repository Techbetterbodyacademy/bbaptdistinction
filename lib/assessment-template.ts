import type { AssessmentKind } from "./assessment";

const VALID_KINDS: AssessmentKind[] = ["postural", "movement", "strength", "mobility", "cardio"];

export type TemplateInput = {
  title: string;
  kind: AssessmentKind;
  description?: string;
};

export type TemplateRecord = {
  title: string;
  kind: AssessmentKind;
  description: string | null;
};

export type PrepareResult<T> = { ok: true; record: T } | { ok: false; error: string };

export function prepareTemplateInput(input: TemplateInput): PrepareResult<TemplateRecord> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "title required" };
  if (!VALID_KINDS.includes(input.kind)) return { ok: false, error: "kind invalid" };
  const description = input.description?.trim() ?? "";
  return {
    ok: true,
    record: { title, kind: input.kind, description: description.length ? description : null }
  };
}

export type TemplateItemInput = {
  label: string;
  unit?: string;
  target_value?: number;
  order_index: number;
};

export type TemplateItemRecord = {
  label: string;
  unit: string | null;
  target_value: number | null;
  order_index: number;
};

export function prepareTemplateItemInput(input: TemplateItemInput): PrepareResult<TemplateItemRecord> {
  const label = input.label.trim();
  if (!label) return { ok: false, error: "label required" };
  const unit = input.unit?.trim() ?? "";
  const target_value = typeof input.target_value === "number" && Number.isFinite(input.target_value)
    ? input.target_value
    : null;
  return {
    ok: true,
    record: {
      label,
      unit: unit.length ? unit : null,
      target_value,
      order_index: input.order_index
    }
  };
}

export type TemplateItemRow = {
  label: string;
  unit: string | null;
  target_value: number | null;
  order_index: number;
};

export type InstantiatedMeasurement = {
  label: string;
  unit: string | null;
  target_value: number | null;
  value: number | null;
  score: string | null;
  order_index: number;
};

export function instantiateFromTemplate(items: TemplateItemRow[]): InstantiatedMeasurement[] {
  return items.map((item) => ({
    label: item.label,
    unit: item.unit,
    target_value: item.target_value,
    value: null,
    score: null,
    order_index: item.order_index
  }));
}
