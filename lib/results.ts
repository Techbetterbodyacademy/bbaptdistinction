export type MetricDirection = "lower_better" | "higher_better" | "neutral";
const DIRECTIONS: MetricDirection[] = ["lower_better", "higher_better", "neutral"];

export type MetricInput = {
  name: string;
  unit: string;
  direction: MetricDirection;
};

export type MetricRecord = MetricInput;

export type MeasurementInput = {
  value: number;
  recorded_at: string;
  notes?: string;
};

export type MeasurementRecord = {
  value: number;
  recorded_at: string;
  notes: string | null;
};

export type PrepareResult<T> = { ok: true; record: T } | { ok: false; error: string };

export function prepareMetricInput(input: MetricInput): PrepareResult<MetricRecord> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "name required" };
  const unit = input.unit.trim();
  if (!unit) return { ok: false, error: "unit required" };
  if (!DIRECTIONS.includes(input.direction)) return { ok: false, error: "direction invalid" };
  return { ok: true, record: { name, unit, direction: input.direction } };
}

export function prepareMeasurementInput(input: MeasurementInput): PrepareResult<MeasurementRecord> {
  if (!Number.isFinite(input.value)) return { ok: false, error: "value must be numeric" };
  if (Number.isNaN(Date.parse(input.recorded_at))) return { ok: false, error: "recorded_at must be a valid date" };
  const notes = input.notes?.trim() ?? "";
  return {
    ok: true,
    record: {
      value: input.value,
      recorded_at: input.recorded_at,
      notes: notes.length ? notes : null
    }
  };
}

export type MeasurementRow = {
  value: number;
  recorded_at: string;
};

export type TrendLabel = "improving" | "worsening" | "flat" | "no_data";

export type Trend = {
  first: number;
  latest: number;
  delta: number;
  label: TrendLabel;
};

export function computeTrend(
  rows: MeasurementRow[],
  direction: MetricDirection = "neutral"
): Trend {
  if (rows.length < 2) {
    return { first: rows[0]?.value ?? 0, latest: rows[0]?.value ?? 0, delta: 0, label: "no_data" };
  }
  const sorted = rows.slice().sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at));
  const first = sorted[0].value;
  const latest = sorted[sorted.length - 1].value;
  const delta = latest - first;
  let label: TrendLabel = "flat";
  if (delta === 0) label = "flat";
  else if (direction === "lower_better") label = delta < 0 ? "improving" : "worsening";
  else if (direction === "higher_better") label = delta > 0 ? "improving" : "worsening";
  else label = "flat";
  return { first, latest, delta, label };
}
