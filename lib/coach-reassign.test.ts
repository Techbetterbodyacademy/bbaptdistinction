import { describe, test, expect } from "vitest";
import { prepareCoachReassign } from "./coach-reassign";

describe("prepareCoachReassign", () => {
  test("accepts assignment to the workspace owner", () => {
    const r = prepareCoachReassign({
      client_id: "c1",
      coach_id: "owner-1",
      workspace_owner_id: "owner-1",
      accepted_trainer_ids: []
    });
    expect(r.ok).toBe(true);
  });

  test("accepts assignment to an accepted trainer", () => {
    const r = prepareCoachReassign({
      client_id: "c1",
      coach_id: "trainer-1",
      workspace_owner_id: "owner-1",
      accepted_trainer_ids: ["trainer-1", "trainer-2"]
    });
    expect(r.ok).toBe(true);
  });

  test("rejects when client_id is missing", () => {
    const r = prepareCoachReassign({
      client_id: "",
      coach_id: "owner-1",
      workspace_owner_id: "owner-1",
      accepted_trainer_ids: []
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/client/i);
  });

  test("rejects when coach_id is missing", () => {
    const r = prepareCoachReassign({
      client_id: "c1",
      coach_id: "",
      workspace_owner_id: "owner-1",
      accepted_trainer_ids: []
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/coach/i);
  });

  test("rejects assignment to a trainer who isn't in the accepted list", () => {
    const r = prepareCoachReassign({
      client_id: "c1",
      coach_id: "random-uuid",
      workspace_owner_id: "owner-1",
      accepted_trainer_ids: ["trainer-1", "trainer-2"]
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/not in|invalid|valid/i);
  });

  test("rejects assignment to an invited-but-not-accepted trainer", () => {
    const r = prepareCoachReassign({
      client_id: "c1",
      coach_id: "trainer-pending",
      workspace_owner_id: "owner-1",
      accepted_trainer_ids: ["trainer-1"]
    });
    expect(r.ok).toBe(false);
  });

  test("owner being also listed as a trainer is still valid", () => {
    const r = prepareCoachReassign({
      client_id: "c1",
      coach_id: "owner-1",
      workspace_owner_id: "owner-1",
      accepted_trainer_ids: ["owner-1"]
    });
    expect(r.ok).toBe(true);
  });
});
