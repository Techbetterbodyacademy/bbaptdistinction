import { describe, test, expect } from "vitest";
import { computeRiskScore, type RiskInput } from "./at-risk";

const baseline: RiskInput = {
  lifecycle_stage: "momentum",
  days_since_checkin: 0,
  days_since_session: 0,
  sessions_last_7d: 3,
  expected_weekly_sessions: 3,
  days_since_client_message: 0
};

describe("computeRiskScore", () => {
  test("returns 0 score and 'low' level for a fully engaged client", () => {
    const r = computeRiskScore(baseline);
    expect(r.score).toBe(0);
    expect(r.level).toBe("low");
    expect(r.reasons).toEqual([]);
  });

  test("flags missed check-in (7-13 days)", () => {
    const r = computeRiskScore({ ...baseline, days_since_checkin: 8 });
    expect(r.score).toBeGreaterThanOrEqual(30);
    expect(r.reasons.some((x) => /check.?in/i.test(x))).toBe(true);
  });

  test("escalates when check-in is missed 14+ days", () => {
    const r14 = computeRiskScore({ ...baseline, days_since_checkin: 14 });
    const r10 = computeRiskScore({ ...baseline, days_since_checkin: 10 });
    expect(r14.score).toBeGreaterThan(r10.score);
  });

  test("flags zero sessions in 7 days when 3 are expected", () => {
    const r = computeRiskScore({ ...baseline, sessions_last_7d: 0 });
    expect(r.score).toBeGreaterThanOrEqual(30);
    expect(r.reasons.some((x) => /session|workout/i.test(x))).toBe(true);
  });

  test("does not flag missed sessions for a client expecting 0/week (paused-style)", () => {
    const r = computeRiskScore({ ...baseline, sessions_last_7d: 0, expected_weekly_sessions: 0 });
    expect(r.reasons.some((x) => /session|workout/i.test(x))).toBe(false);
  });

  test("flags long silence from client (14+ days no messages)", () => {
    const r = computeRiskScore({ ...baseline, days_since_client_message: 15 });
    expect(r.reasons.some((x) => /message|silent/i.test(x))).toBe(true);
  });

  test("level is 'high' when score >= 60", () => {
    const r = computeRiskScore({
      ...baseline,
      days_since_checkin: 14,
      sessions_last_7d: 0,
      days_since_client_message: 15
    });
    expect(r.score).toBeGreaterThanOrEqual(60);
    expect(r.level).toBe("high");
  });

  test("level is 'medium' when score is 30-59", () => {
    const r = computeRiskScore({ ...baseline, days_since_checkin: 8 });
    expect(r.score).toBeGreaterThanOrEqual(30);
    expect(r.score).toBeLessThan(60);
    expect(r.level).toBe("medium");
  });

  test("offboarded clients always return 0 (lost, not at-risk)", () => {
    const r = computeRiskScore({
      ...baseline,
      lifecycle_stage: "offboarded",
      days_since_checkin: 90,
      sessions_last_7d: 0
    });
    expect(r.score).toBe(0);
    expect(r.level).toBe("low");
  });

  test("onboarding clients use a softer threshold (haven't built habits yet)", () => {
    const r = computeRiskScore({
      ...baseline,
      lifecycle_stage: "onboarding",
      days_since_checkin: 8,
      sessions_last_7d: 0
    });
    // Should still flag, but at lower severity than momentum stage
    const sameInMomentum = computeRiskScore({
      ...baseline,
      lifecycle_stage: "momentum",
      days_since_checkin: 8,
      sessions_last_7d: 0
    });
    expect(r.score).toBeLessThan(sameInMomentum.score);
  });

  test("client already in catchup_call stage still scores (intervention may not have worked)", () => {
    const r = computeRiskScore({
      ...baseline,
      lifecycle_stage: "catchup_call",
      days_since_checkin: 14,
      sessions_last_7d: 0
    });
    expect(r.score).toBeGreaterThan(0);
  });
});
