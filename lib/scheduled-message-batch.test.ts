import { describe, test, expect } from "vitest";
import { partitionDueScheduledMessages, type ScheduledRow } from "./scheduled-message-batch";

describe("partitionDueScheduledMessages", () => {
  const now = new Date("2026-05-27T12:00:00Z");

  const past: ScheduledRow = {
    id: "p1",
    thread_id: "t1",
    sender_user_id: "u1",
    body: "due now",
    scheduled_for: "2026-05-27T11:59:00Z",
    status: "pending"
  };
  const present: ScheduledRow = {
    id: "p2",
    thread_id: "t2",
    sender_user_id: "u1",
    body: "due exactly now",
    scheduled_for: "2026-05-27T12:00:00Z",
    status: "pending"
  };
  const future: ScheduledRow = {
    id: "p3",
    thread_id: "t3",
    sender_user_id: "u1",
    body: "not yet",
    scheduled_for: "2026-05-27T13:00:00Z",
    status: "pending"
  };
  const alreadySent: ScheduledRow = {
    id: "p4",
    thread_id: "t4",
    sender_user_id: "u1",
    body: "already done",
    scheduled_for: "2026-05-27T11:00:00Z",
    status: "sent"
  };

  test("returns only pending rows whose scheduled_for is past or now", () => {
    const result = partitionDueScheduledMessages([past, present, future, alreadySent], now);

    expect(result.due.map((r) => r.id).sort()).toEqual(["p1", "p2"]);
    expect(result.notYet.map((r) => r.id)).toEqual(["p3"]);
    expect(result.skipped.map((r) => r.id)).toEqual(["p4"]);
  });

  test("returns empty when nothing is due", () => {
    const result = partitionDueScheduledMessages([future], now);

    expect(result.due).toEqual([]);
    expect(result.notYet.length).toBe(1);
  });

  test("respects sender_user_id passthrough", () => {
    const result = partitionDueScheduledMessages([past], now);
    expect(result.due[0].sender_user_id).toBe("u1");
  });
});
