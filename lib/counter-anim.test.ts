import { describe, test, expect } from "vitest";
import { easeOutCubic, valueAtProgress, parseStatValue, formatStatValue } from "./counter-anim";

describe("easeOutCubic", () => {
  test("returns 0 at progress 0", () => {
    expect(easeOutCubic(0)).toBe(0);
  });

  test("returns 1 at progress 1", () => {
    expect(easeOutCubic(1)).toBe(1);
  });

  test("decelerates (value at 0.5 > 0.5 linear)", () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  test("clamps below 0", () => {
    expect(easeOutCubic(-0.5)).toBe(0);
  });

  test("clamps above 1", () => {
    expect(easeOutCubic(1.5)).toBe(1);
  });
});

describe("valueAtProgress", () => {
  test("returns start at progress 0", () => {
    expect(valueAtProgress(0, 100, 0)).toBe(0);
  });

  test("returns end at progress 1", () => {
    expect(valueAtProgress(0, 100, 1)).toBe(100);
  });

  test("interpolates between start and end", () => {
    const mid = valueAtProgress(0, 100, 0.5);
    expect(mid).toBeGreaterThan(50);
    expect(mid).toBeLessThan(100);
  });

  test("handles non-zero start", () => {
    expect(valueAtProgress(50, 150, 0)).toBe(50);
    expect(valueAtProgress(50, 150, 1)).toBe(150);
  });
});

describe("parseStatValue", () => {
  test("parses plain number", () => {
    expect(parseStatValue("400")).toEqual({ value: 400, prefix: "", suffix: "" });
  });

  test("parses number with plus suffix", () => {
    expect(parseStatValue("400+")).toEqual({ value: 400, prefix: "", suffix: "+" });
  });

  test("parses number with percent suffix", () => {
    expect(parseStatValue("94%")).toEqual({ value: 94, prefix: "", suffix: "%" });
  });

  test("parses number with unit suffix", () => {
    expect(parseStatValue("12000kg")).toEqual({ value: 12000, prefix: "", suffix: "kg" });
  });

  test("parses number with hour suffix", () => {
    expect(parseStatValue("24h")).toEqual({ value: 24, prefix: "", suffix: "h" });
  });

  test("preserves comma-separated original via formatStatValue", () => {
    const parsed = parseStatValue("12,000kg");
    expect(parsed.value).toBe(12000);
    expect(parsed.suffix).toBe("kg");
  });
});

describe("formatStatValue", () => {
  test("formats whole number without commas under 1000", () => {
    expect(formatStatValue(94, "", "%")).toBe("94%");
  });

  test("inserts thousands separator for >= 1000", () => {
    expect(formatStatValue(12000, "", "kg")).toBe("12,000kg");
  });

  test("appends plus suffix", () => {
    expect(formatStatValue(400, "", "+")).toBe("400+");
  });

  test("rounds floats to integer", () => {
    expect(formatStatValue(94.7, "", "%")).toBe("95%");
  });
});
