import { describe, test, expect } from "vitest";
import { computeCoachWorkload, type CoachAssignment } from "./coach-workload";

const c = (coachId: string | null, stage: "momentum" | "offboarded" | "onboarding" | "catchup_call", risk: "low" | "medium" | "high"): CoachAssignment => ({
  coach_id: coachId,
  lifecycle_stage: stage,
  risk_level: risk
});

describe("computeCoachWorkload", () => {
  test("returns empty list for no clients", () => {
    expect(computeCoachWorkload([], [])).toEqual([]);
  });

  test("aggregates client count per coach", () => {
    const coaches = [
      { user_id: "coach-1", name: "Alice" },
      { user_id: "coach-2", name: "Bob" }
    ];
    const clients = [
      c("coach-1", "momentum", "low"),
      c("coach-1", "momentum", "low"),
      c("coach-2", "momentum", "low")
    ];
    const result = computeCoachWorkload(coaches, clients);
    expect(result[0].name).toBe("Alice");
    expect(result[0].total).toBe(2);
    expect(result[1].name).toBe("Bob");
    expect(result[1].total).toBe(1);
  });

  test("excludes offboarded from active count", () => {
    const coaches = [{ user_id: "coach-1", name: "Alice" }];
    const clients = [c("coach-1", "momentum", "low"), c("coach-1", "offboarded", "low")];
    const r = computeCoachWorkload(coaches, clients);
    expect(r[0].total).toBe(2);
    expect(r[0].active).toBe(1);
    expect(r[0].offboarded).toBe(1);
  });

  test("counts at-risk by risk level", () => {
    const coaches = [{ user_id: "coach-1", name: "Alice" }];
    const clients = [
      c("coach-1", "momentum", "low"),
      c("coach-1", "momentum", "medium"),
      c("coach-1", "momentum", "high"),
      c("coach-1", "momentum", "high")
    ];
    const r = computeCoachWorkload(coaches, clients);
    expect(r[0].atRiskMedium).toBe(1);
    expect(r[0].atRiskHigh).toBe(2);
    expect(r[0].atRiskTotal).toBe(3);
  });

  test("includes coaches with zero clients", () => {
    const coaches = [
      { user_id: "coach-1", name: "Alice" },
      { user_id: "coach-2", name: "Bob" }
    ];
    const clients = [c("coach-1", "momentum", "low")];
    const r = computeCoachWorkload(coaches, clients);
    expect(r.find((x) => x.name === "Bob")?.total).toBe(0);
  });

  test("sorts by total active count desc", () => {
    const coaches = [
      { user_id: "coach-1", name: "Alice" },
      { user_id: "coach-2", name: "Bob" },
      { user_id: "coach-3", name: "Carol" }
    ];
    const clients = [
      c("coach-2", "momentum", "low"),
      c("coach-2", "momentum", "low"),
      c("coach-2", "momentum", "low"),
      c("coach-1", "momentum", "low")
    ];
    const r = computeCoachWorkload(coaches, clients);
    expect(r.map((x) => x.name)).toEqual(["Bob", "Alice", "Carol"]);
  });

  test("includes 'Unassigned' bucket for clients with no coach", () => {
    const coaches = [{ user_id: "coach-1", name: "Alice" }];
    const clients = [c(null, "momentum", "low"), c(null, "momentum", "high"), c("coach-1", "momentum", "low")];
    const r = computeCoachWorkload(coaches, clients);
    const unassigned = r.find((x) => x.name === "Unassigned");
    expect(unassigned?.total).toBe(2);
    expect(unassigned?.atRiskHigh).toBe(1);
  });
});
