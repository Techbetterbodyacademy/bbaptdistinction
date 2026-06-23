import { describe, test, expect } from "vitest";
import { buildPtdParsePrompt } from "./ptd-import";

describe("buildPtdParsePrompt", () => {
  test("returns 2 messages: system + user", () => {
    const m = buildPtdParsePrompt("2 - BEGINNER - GYM - 2 DAY\nWeek 1\nDay 1: Squat 3x8, Bench 3x8");
    expect(m.length).toBe(2);
    expect(m[0].role).toBe("system");
    expect(m[1].role).toBe("user");
  });

  test("system prompt requires JSON output", () => {
    const m = buildPtdParsePrompt("x");
    expect(m[0].content.toLowerCase()).toContain("json");
  });

  test("system prompt mentions PT Distinction structure", () => {
    const m = buildPtdParsePrompt("x");
    expect(m[0].content.toLowerCase()).toMatch(/pt distinction|phase|week|day/);
  });

  test("user message embeds the raw pasted text verbatim", () => {
    const raw = "Week 1\nDay 1: Squat 3x8\nDay 2: Bench 3x8";
    const m = buildPtdParsePrompt(raw);
    expect(m[1].content).toContain("Week 1");
    expect(m[1].content).toContain("Squat 3x8");
  });

  test("system prompt enforces no em-dashes (BBA voice)", () => {
    const m = buildPtdParsePrompt("x");
    expect(m[0].content).toContain("em-dash");
  });
});
