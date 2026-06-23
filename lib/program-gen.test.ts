import { describe, test, expect } from "vitest";
import { buildProgramPrompt, parseProgramResponse } from "./program-gen";

describe("buildProgramPrompt", () => {
  test("returns system + user messages containing all spec details", () => {
    const messages = buildProgramPrompt({
      name: "Foundations 12-week",
      audience: "men-40-60",
      weeks: 12,
      sessions_per_week: 3,
      goal: "fat loss",
      constraints: "knee-friendly, no overhead pressing"
    });

    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
    const user = messages[1].content;
    expect(user).toContain("Foundations 12-week");
    expect(user).toContain("men-40-60");
    expect(user).toContain("12");
    expect(user).toContain("3");
    expect(user).toContain("fat loss");
    expect(user).toContain("knee-friendly");
  });

  test("system prompt requires JSON output", () => {
    const messages = buildProgramPrompt({
      name: "x",
      audience: "men-40-60",
      weeks: 4,
      sessions_per_week: 3,
      goal: "strength"
    });
    expect(messages[0].content.toLowerCase()).toContain("json");
  });

  test("system prompt enforces no em-dashes (BBA brand voice)", () => {
    const messages = buildProgramPrompt({
      name: "x",
      audience: "men-40-60",
      weeks: 4,
      sessions_per_week: 3,
      goal: "strength"
    });
    expect(messages[0].content).toContain("em-dash");
  });
});

describe("parseProgramResponse", () => {
  const valid = {
    name: "Foundations",
    description: "12 weeks of foundational strength",
    weeks: [
      {
        week_number: 1,
        workouts: [
          {
            day_number: 1,
            name: "Upper push",
            notes: "Warm up 5 min bike.",
            exercises: [
              { name: "Goblet squat", target_sets: 3, target_reps: "8-10", target_rpe: 7, rest_seconds: 90 }
            ]
          }
        ]
      }
    ]
  };

  test("parses a valid response", () => {
    const result = parseProgramResponse(JSON.stringify(valid));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.program.name).toBe("Foundations");
      expect(result.program.weeks).toHaveLength(1);
      expect(result.program.weeks[0].workouts[0].exercises[0].name).toBe("Goblet squat");
    }
  });

  test("rejects non-JSON", () => {
    const result = parseProgramResponse("not json at all");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/json/i);
  });

  test("rejects missing program name", () => {
    const bad = { ...valid, name: "" };
    const result = parseProgramResponse(JSON.stringify(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/name/i);
  });

  test("rejects empty weeks array", () => {
    const bad = { ...valid, weeks: [] };
    const result = parseProgramResponse(JSON.stringify(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/week/i);
  });

  test("rejects workout with zero exercises", () => {
    const bad = JSON.parse(JSON.stringify(valid));
    bad.weeks[0].workouts[0].exercises = [];
    const result = parseProgramResponse(JSON.stringify(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/exercise/i);
  });

  test("rejects exercise with missing name", () => {
    const bad = JSON.parse(JSON.stringify(valid));
    bad.weeks[0].workouts[0].exercises[0].name = "";
    const result = parseProgramResponse(JSON.stringify(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/exercise/i);
  });

  test("normalises week_number/day_number/order_index", () => {
    const result = parseProgramResponse(JSON.stringify(valid));
    expect(result.ok).toBe(true);
    if (result.ok) {
      const w = result.program.weeks[0];
      expect(w.week_number).toBe(1);
      expect(w.workouts[0].day_number).toBe(1);
    }
  });
});
