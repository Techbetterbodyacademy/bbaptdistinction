import { describe, test, expect } from "vitest";
import {
  prepareLifecycleEvent,
  partitionUpcomingEvents,
  stageFromEventType,
  type LifecycleEventRow
} from "./lifecycle-event";

describe("prepareLifecycleEvent", () => {
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  test("clean record for a valid future catchup call", () => {
    const r = prepareLifecycleEvent({
      client_id: "c1",
      event_type: "catchup_call",
      scheduled_for: future,
      duration_minutes: 30,
      notes: "  saving Mark from churn  "
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.record.event_type).toBe("catchup_call");
      expect(r.record.duration_minutes).toBe(30);
      expect(r.record.notes).toBe("saving Mark from churn");
    }
  });

  test("rejects empty client_id", () => {
    const r = prepareLifecycleEvent({
      client_id: "",
      event_type: "catchup_call",
      scheduled_for: future,
      duration_minutes: 30
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/client/i);
  });

  test("rejects unknown event_type", () => {
    const r = prepareLifecycleEvent({
      client_id: "c1",
      event_type: "magic" as never,
      scheduled_for: future,
      duration_minutes: 30
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/event_type/i);
  });

  test("rejects past scheduled_for", () => {
    const r = prepareLifecycleEvent({
      client_id: "c1",
      event_type: "catchup_call",
      scheduled_for: past,
      duration_minutes: 30
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/future/i);
  });

  test("rejects invalid duration", () => {
    const r = prepareLifecycleEvent({
      client_id: "c1",
      event_type: "catchup_call",
      scheduled_for: future,
      duration_minutes: 0
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/duration/i);
  });

  test("notes are optional", () => {
    const r = prepareLifecycleEvent({
      client_id: "c1",
      event_type: "kickoff_call",
      scheduled_for: future,
      duration_minutes: 15
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.record.notes).toBeNull();
  });
});

describe("partitionUpcomingEvents", () => {
  const now = new Date("2026-06-15T12:00:00Z");
  const ev = (id: string, iso: string, status: LifecycleEventRow["status"] = "scheduled"): LifecycleEventRow => ({
    id,
    event_type: "catchup_call",
    scheduled_for: iso,
    status
  });

  test("groups events into today / this_week / later / past", () => {
    const events: LifecycleEventRow[] = [
      ev("today1", "2026-06-15T15:00:00Z"),
      ev("week1", "2026-06-17T15:00:00Z"),
      ev("later1", "2026-06-25T15:00:00Z"),
      ev("past1", "2026-06-14T15:00:00Z")
    ];
    const p = partitionUpcomingEvents(events, now);
    expect(p.today.map((e) => e.id)).toEqual(["today1"]);
    expect(p.thisWeek.map((e) => e.id)).toEqual(["week1"]);
    expect(p.later.map((e) => e.id)).toEqual(["later1"]);
    expect(p.past.map((e) => e.id)).toEqual(["past1"]);
  });

  test("treats cancelled and completed as past", () => {
    const events: LifecycleEventRow[] = [
      ev("done", "2026-06-16T15:00:00Z", "completed"),
      ev("cancel", "2026-06-17T15:00:00Z", "cancelled"),
      ev("scheduled", "2026-06-16T15:00:00Z", "scheduled")
    ];
    const p = partitionUpcomingEvents(events, now);
    expect(p.past.map((e) => e.id).sort()).toEqual(["cancel", "done"]);
    expect(p.thisWeek.map((e) => e.id)).toEqual(["scheduled"]);
  });
});

describe("stageFromEventType", () => {
  test("catchup_call -> catchup_call stage", () => {
    expect(stageFromEventType("catchup_call")).toBe("catchup_call");
  });
  test("retreat -> retreat stage", () => {
    expect(stageFromEventType("retreat")).toBe("retreat");
  });
  test("kickoff_call -> kickoff stage", () => {
    expect(stageFromEventType("kickoff_call")).toBe("kickoff");
  });
  test("celebration_call -> celebration stage", () => {
    expect(stageFromEventType("celebration_call")).toBe("celebration");
  });
  test("strategy_call has no stage mapping (returns null)", () => {
    expect(stageFromEventType("strategy_call")).toBeNull();
  });
});
