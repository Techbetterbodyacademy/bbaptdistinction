import { describe, test, expect } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import type { MemberIntake } from "./schema";

const intake: MemberIntake = {
  age: 45,
  heightCm: 178,
  weightKg: 92,
  sex: "male",
  activity: "moderate",
  goal: "cut",
  calories: 2200,
  proteinG: 180,
  mealsPerDay: 4,
  fastBreakfast: true,
  cuisines: ["mediterranean", "asian"],
  allergies: "shellfish, peanuts",
  dietStyle: "omnivore",
  trainingDays: 4
};

describe("buildSystemPrompt", () => {
  test("includes Jase voice anchor", () => {
    const p = buildSystemPrompt();
    expect(p.toLowerCase()).toMatch(/jase|better body academy/);
  });

  test("asks for 7 days", () => {
    expect(buildSystemPrompt()).toMatch(/7[- ]day|seven[- ]day/i);
  });

  test("instructs no em-dashes", () => {
    expect(buildSystemPrompt().toLowerCase()).toMatch(/no em[- ]?dash/);
  });
});

describe("buildUserPrompt", () => {
  test("interpolates every numeric intake field", () => {
    const p = buildUserPrompt(intake);
    expect(p).toContain("2200");
    expect(p).toContain("180");
    expect(p).toContain("4");
    expect(p).toContain("92");
    expect(p).toContain("178");
    expect(p).toContain("45");
  });

  test("renders allergies as a constraint", () => {
    const p = buildUserPrompt(intake);
    expect(p.toLowerCase()).toMatch(/avoid|exclude|allergi/);
    expect(p).toContain("shellfish");
    expect(p).toContain("peanuts");
  });

  test("lists cuisines when present", () => {
    const p = buildUserPrompt(intake);
    expect(p.toLowerCase()).toContain("mediterranean");
    expect(p.toLowerCase()).toContain("asian");
  });

  test("omits cuisine line entirely when none selected", () => {
    const p = buildUserPrompt({ ...intake, cuisines: [] });
    expect(p.toLowerCase()).not.toMatch(/cuisine/);
  });

  test("mentions fasting when fastBreakfast is true", () => {
    expect(buildUserPrompt(intake).toLowerCase()).toMatch(/fast|skip breakfast/);
  });

  test("omits fasting line when fastBreakfast is false", () => {
    expect(buildUserPrompt({ ...intake, fastBreakfast: false }).toLowerCase()).not.toMatch(/fast|skip breakfast/);
  });
});
