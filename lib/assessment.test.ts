import { describe, test, expect } from "vitest";
import { scoreROM, prepareAssessmentInput } from "./assessment";

describe("scoreROM (range of motion)", () => {
  test("poor when degrees below 50% of target", () => {
    expect(scoreROM(40, 100)).toBe("poor");
  });

  test("fair when degrees 50-80% of target", () => {
    expect(scoreROM(60, 100)).toBe("fair");
    expect(scoreROM(75, 100)).toBe("fair");
  });

  test("good when degrees 80%+ of target", () => {
    expect(scoreROM(80, 100)).toBe("good");
    expect(scoreROM(120, 100)).toBe("good");
  });

  test("rejects zero or negative target", () => {
    expect(() => scoreROM(50, 0)).toThrow();
    expect(() => scoreROM(50, -10)).toThrow();
  });
});

describe("prepareAssessmentInput", () => {
  test("clean record for valid input", () => {
    const result = prepareAssessmentInput({
      title: "  Initial postural assessment  ",
      notes: "  Shoulders forward, anterior pelvic tilt  ",
      kind: "postural"
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.title).toBe("Initial postural assessment");
      expect(result.record.notes).toBe("Shoulders forward, anterior pelvic tilt");
      expect(result.record.kind).toBe("postural");
    }
  });

  test("rejects missing title", () => {
    const result = prepareAssessmentInput({ title: "", kind: "postural" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/title/i);
  });

  test("rejects unknown kind", () => {
    const result = prepareAssessmentInput({ title: "x", kind: "magic" as never });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/kind/i);
  });

  test("notes are optional", () => {
    const result = prepareAssessmentInput({ title: "ok", kind: "movement" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.record.notes).toBeNull();
  });
});
