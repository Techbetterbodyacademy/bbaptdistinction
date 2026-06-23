import { describe, test, expect } from "vitest";
import {
  prepareMetricInput,
  prepareMeasurementInput,
  computeTrend,
  type MeasurementRow
} from "./results";

describe("prepareMetricInput", () => {
  test("clean record for valid input", () => {
    const r = prepareMetricInput({
      name: "  Waist  ",
      unit: "  cm  ",
      direction: "lower_better"
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.record.name).toBe("Waist");
      expect(r.record.unit).toBe("cm");
      expect(r.record.direction).toBe("lower_better");
    }
  });

  test("rejects empty name", () => {
    const r = prepareMetricInput({ name: " ", unit: "kg", direction: "lower_better" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/name/i);
  });

  test("rejects empty unit", () => {
    const r = prepareMetricInput({ name: "x", unit: " ", direction: "lower_better" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/unit/i);
  });

  test("rejects invalid direction", () => {
    const r = prepareMetricInput({ name: "x", unit: "kg", direction: "magic" as never });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/direction/i);
  });
});

describe("prepareMeasurementInput", () => {
  test("clean record for valid input", () => {
    const r = prepareMeasurementInput({ value: 85.5, recorded_at: "2026-06-11T12:00:00Z" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.record.value).toBe(85.5);
  });

  test("rejects NaN", () => {
    const r = prepareMeasurementInput({ value: NaN, recorded_at: "2026-06-11T12:00:00Z" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/value/i);
  });

  test("rejects invalid recorded_at", () => {
    const r = prepareMeasurementInput({ value: 10, recorded_at: "not a date" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/date|recorded_at/i);
  });
});

describe("computeTrend", () => {
  const rows: MeasurementRow[] = [
    { value: 90, recorded_at: "2026-04-01T00:00:00Z" },
    { value: 88, recorded_at: "2026-05-01T00:00:00Z" },
    { value: 85, recorded_at: "2026-06-01T00:00:00Z" }
  ];

  test("returns first, latest, and delta", () => {
    const t = computeTrend(rows);
    expect(t.first).toBe(90);
    expect(t.latest).toBe(85);
    expect(t.delta).toBe(-5);
  });

  test("'improving' when lower_better and decreasing", () => {
    expect(computeTrend(rows, "lower_better").label).toBe("improving");
  });

  test("'worsening' when higher_better and decreasing", () => {
    expect(computeTrend(rows, "higher_better").label).toBe("worsening");
  });

  test("'flat' when no change", () => {
    const flat = [
      { value: 80, recorded_at: "2026-04-01T00:00:00Z" },
      { value: 80, recorded_at: "2026-05-01T00:00:00Z" }
    ];
    expect(computeTrend(flat, "lower_better").label).toBe("flat");
  });

  test("'no_data' on empty", () => {
    expect(computeTrend([], "lower_better").label).toBe("no_data");
  });

  test("'no_data' on single row", () => {
    expect(computeTrend([rows[0]], "lower_better").label).toBe("no_data");
  });
});
