import { describe, test, expect } from "vitest";
import { computeMacros } from "./mifflin";

describe("computeMacros (Mifflin-St Jeor)", () => {
  test("male, 40yo, 180cm, 90kg, moderate, maintain", () => {
    const r = computeMacros({ age: 40, heightCm: 180, weightKg: 90, sex: "male", activity: "moderate", goal: "maintain" });
    expect(r.calories).toBeGreaterThanOrEqual(2800);
    expect(r.calories).toBeLessThanOrEqual(2900);
    expect(r.proteinG).toBe(144);
  });

  test("female, 35yo, 165cm, 65kg, light, cut", () => {
    const r = computeMacros({ age: 35, heightCm: 165, weightKg: 65, sex: "female", activity: "light", goal: "cut" });
    expect(r.calories).toBeGreaterThanOrEqual(1300);
    expect(r.calories).toBeLessThanOrEqual(1500);
    expect(r.proteinG).toBe(130);
  });

  test("gain adds 400 cal vs maintain", () => {
    const base = { age: 30, heightCm: 175, weightKg: 80, sex: "male" as const, activity: "moderate" as const };
    const maintain = computeMacros({ ...base, goal: "maintain" });
    const gain = computeMacros({ ...base, goal: "gain" });
    expect(gain.calories - maintain.calories).toBe(400);
  });

  test("cut subtracts 500 cal vs maintain", () => {
    const base = { age: 30, heightCm: 175, weightKg: 80, sex: "male" as const, activity: "moderate" as const };
    const maintain = computeMacros({ ...base, goal: "maintain" });
    const cut = computeMacros({ ...base, goal: "cut" });
    expect(maintain.calories - cut.calories).toBe(500);
  });

  test("activity multipliers (sedentary 1.2, athlete 1.9)", () => {
    const base = { age: 30, heightCm: 175, weightKg: 80, sex: "male" as const, goal: "maintain" as const };
    const sedentary = computeMacros({ ...base, activity: "sedentary" });
    const athlete = computeMacros({ ...base, activity: "athlete" });
    const ratio = athlete.calories / sedentary.calories;
    expect(ratio).toBeCloseTo(1.9 / 1.2, 2);
  });

  test("calories clamp to [1200, 5000]", () => {
    const low = computeMacros({ age: 80, heightCm: 150, weightKg: 40, sex: "female", activity: "sedentary", goal: "cut" });
    expect(low.calories).toBeGreaterThanOrEqual(1200);
    const high = computeMacros({ age: 20, heightCm: 210, weightKg: 130, sex: "male", activity: "athlete", goal: "gain" });
    expect(high.calories).toBeLessThanOrEqual(5000);
  });

  test("protein clamps to [50, 400]", () => {
    const low = computeMacros({ age: 80, heightCm: 150, weightKg: 30, sex: "female", activity: "sedentary", goal: "maintain" });
    expect(low.proteinG).toBeGreaterThanOrEqual(50);
    const high = computeMacros({ age: 20, heightCm: 210, weightKg: 250, sex: "male", activity: "athlete", goal: "cut" });
    expect(high.proteinG).toBeLessThanOrEqual(400);
  });

  test("neutral sex falls back to a fixed BMR base", () => {
    const r = computeMacros({ age: 40, heightCm: 175, weightKg: 75, sex: "neutral", activity: "moderate", goal: "maintain" });
    expect(r.calories).toBeGreaterThan(2000);
    expect(r.calories).toBeLessThan(3000);
  });
});
