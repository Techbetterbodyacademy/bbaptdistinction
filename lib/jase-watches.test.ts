import { describe, test, expect } from "vitest";
import {
  computeJaseWatches,
  formatPercent,
  type ClientStageRow
} from "./jase-watches";

const make = (stage: ClientStageRow["lifecycle_stage"]): ClientStageRow => ({ lifecycle_stage: stage });

describe("computeJaseWatches", () => {
  test("returns all zeros for an empty workspace", () => {
    const w = computeJaseWatches([]);
    expect(w.total).toBe(0);
    expect(w.churnRate).toBe(0);
    expect(w.retentionRate).toBe(0);
    expect(w.renewalRate).toBe(0);
    expect(w.offboardingTotal).toBe(0);
  });

  test("retention 100% when nobody has churned", () => {
    const w = computeJaseWatches([make("momentum"), make("kickoff"), make("celebration")]);
    expect(w.retentionRate).toBe(100);
    expect(w.churnRate).toBe(0);
  });

  test("churn 50% when half are offboarded", () => {
    const w = computeJaseWatches([
      make("momentum"),
      make("kickoff"),
      make("offboarded"),
      make("offboarded")
    ]);
    expect(w.churnRate).toBe(50);
    expect(w.retentionRate).toBe(50);
  });

  test("offboarding total equals offboarded count", () => {
    const w = computeJaseWatches([make("offboarded"), make("offboarded"), make("momentum")]);
    expect(w.offboardingTotal).toBe(2);
  });

  test("renewal rate is over past-onboarding clients only", () => {
    // 4 clients past onboarding (kickoff, momentum, renewed, offboarded). 1 renewed.
    const w = computeJaseWatches([
      make("onboarding"), // not past onboarding
      make("kickoff"),
      make("momentum"),
      make("renewed"),
      make("offboarded")
    ]);
    expect(w.pastOnboardingCount).toBe(4);
    expect(w.renewedCount).toBe(1);
    expect(w.renewalRate).toBe(25);
  });

  test("renewal rate is 0 when nobody is past onboarding yet", () => {
    const w = computeJaseWatches([make("onboarding"), make("onboarding")]);
    expect(w.pastOnboardingCount).toBe(0);
    expect(w.renewalRate).toBe(0);
  });

  test("matches the dashboard fixture (Jase's actual numbers)", () => {
    // From the meeting: 3,358 total, 1,413 cancelled, 1,945 retained, 84 renewed of 2,907 past onboarding.
    const rows: ClientStageRow[] = [
      ...Array(1413).fill({ lifecycle_stage: "offboarded" }),
      ...Array(84).fill({ lifecycle_stage: "renewed" }),
      ...Array(1861).fill({ lifecycle_stage: "momentum" }),
      // 1413 + 84 + 1861 = 3358 total
      // Past onboarding = 3358 - 0 = 3358. To match the 2907 figure, add 451 onboarding rows.
      // Adjust: drop 451 from momentum and call them onboarding so past_onboarding = 2907.
    ];
    // Re-bake to match the fixture exactly:
    const fixture: ClientStageRow[] = [
      ...Array(1413).fill({ lifecycle_stage: "offboarded" }),
      ...Array(84).fill({ lifecycle_stage: "renewed" }),
      ...Array(1410).fill({ lifecycle_stage: "momentum" }), // retained past-onboarding
      ...Array(451).fill({ lifecycle_stage: "onboarding" }) // not yet past onboarding
      // total = 1413 + 84 + 1410 + 451 = 3358
      // past onboarding = 3358 - 451 = 2907 ✓
      // churn = 1413/3358 = 42.08% ≈ 42.1 ✓
      // renewal = 84/2907 = 2.89% ≈ 2.9 ✓
    ];
    void rows;
    const w = computeJaseWatches(fixture);
    expect(w.total).toBe(3358);
    expect(w.churnedCount).toBe(1413);
    expect(w.churnRate).toBe(42.1);
    expect(w.retentionRate).toBe(57.9);
    expect(w.pastOnboardingCount).toBe(2907);
    expect(w.renewedCount).toBe(84);
    expect(w.renewalRate).toBe(2.9);
  });
});

describe("formatPercent", () => {
  test("rounds to 1 decimal place", () => {
    expect(formatPercent(42.08)).toBe("42.1%");
    expect(formatPercent(57.92)).toBe("57.9%");
    expect(formatPercent(2.89)).toBe("2.9%");
  });

  test("handles 0 and 100 cleanly", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(100)).toBe("100%");
  });
});
