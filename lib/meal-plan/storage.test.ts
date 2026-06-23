import { describe, test, expect, vi } from "vitest";
import {
  createStreamingPlan,
  markPlanReady,
  markPlanFailed,
  listPlansForClient,
  listPlansForCoach,
  getPlan,
  countTodayPlansForWorkspace
} from "./storage";

function mockSupabase(handlers: Record<string, unknown>) {
  return {
    from: vi.fn(() => ({
      insert: handlers.insert,
      update: handlers.update,
      select: handlers.select,
      eq: handlers.eq,
      order: handlers.order,
      single: handlers.single,
      maybeSingle: handlers.maybeSingle,
      gte: handlers.gte
    }))
  };
}

describe("createStreamingPlan", () => {
  test("inserts with status='streaming' and returns id", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "plan-1" }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const sb = { from: vi.fn(() => ({ insert })) } as never;

    const result = await createStreamingPlan(sb, {
      workspace_id: "w-1",
      client_id: "c-1",
      coach_id: "u-1",
      intake_json: { goal: "cut" } as never
    });

    expect(result).toEqual({ id: "plan-1" });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ status: "streaming" }));
  });

  test("throws on insert error", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: "rls denied" } });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const sb = { from: vi.fn(() => ({ insert })) } as never;

    await expect(createStreamingPlan(sb, { workspace_id: "w", client_id: "c", coach_id: "u", intake_json: {} as never })).rejects.toThrow(/rls denied/);
  });
});

describe("markPlanReady", () => {
  test("updates plan_json and sets status='ready'", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const sb = { from: vi.fn(() => ({ update })) } as never;

    await markPlanReady(sb, "plan-1", { coachNote: "x" } as never);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "ready" }));
    expect(eq).toHaveBeenCalledWith("id", "plan-1");
  });
});

describe("markPlanFailed", () => {
  test("sets status='failed' and writes error column", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const sb = { from: vi.fn(() => ({ update })) } as never;

    await markPlanFailed(sb, "plan-1", "openai timeout");

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", error: "openai timeout" }));
  });
});

describe("listPlansForClient", () => {
  test("filters to status='ready' for the client", async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const eqStatus = vi.fn(() => ({ order }));
    const eqClient = vi.fn(() => ({ eq: eqStatus }));
    const select = vi.fn(() => ({ eq: eqClient }));
    const sb = { from: vi.fn(() => ({ select })) } as never;

    await listPlansForClient(sb, "c-1");

    expect(eqClient).toHaveBeenCalledWith("client_id", "c-1");
    expect(eqStatus).toHaveBeenCalledWith("status", "ready");
  });
});

describe("listPlansForCoach", () => {
  test("by default excludes failed", async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const neq = vi.fn(() => ({ order }));
    const eq = vi.fn(() => ({ neq }));
    const select = vi.fn(() => ({ eq }));
    const sb = { from: vi.fn(() => ({ select })) } as never;

    await listPlansForCoach(sb, "c-1", { includeFailed: false });

    expect(neq).toHaveBeenCalledWith("status", "failed");
  });

  test("when includeFailed=true skips the status filter", async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const sb = { from: vi.fn(() => ({ select })) } as never;

    await listPlansForCoach(sb, "c-1", { includeFailed: true });

    expect(eq).toHaveBeenCalledWith("client_id", "c-1");
  });
});

describe("countTodayPlansForWorkspace", () => {
  test("returns count of rows created today", async () => {
    const gte = vi.fn().mockResolvedValue({ count: 17, error: null });
    const eq = vi.fn(() => ({ gte }));
    const select = vi.fn(() => ({ eq }));
    const sb = { from: vi.fn(() => ({ select })) } as never;

    const n = await countTodayPlansForWorkspace(sb, "w-1");
    expect(n).toBe(17);
  });
});
