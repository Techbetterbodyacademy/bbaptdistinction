import { describe, test, expect } from "vitest";
import { prepareGroupInput, computeGroupRoster, type GroupMemberRow } from "./groups";

describe("prepareGroupInput", () => {
  test("returns a clean record for valid input", () => {
    const result = prepareGroupInput({ name: "  Strong Together  ", description: "  Mon/Wed/Fri cohort  " });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.name).toBe("Strong Together");
      expect(result.record.description).toBe("Mon/Wed/Fri cohort");
    }
  });

  test("rejects empty name", () => {
    const result = prepareGroupInput({ name: "   " });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("name required");
  });

  test("rejects name over 80 chars", () => {
    const result = prepareGroupInput({ name: "x".repeat(81) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("name too long");
  });

  test("description is optional", () => {
    const result = prepareGroupInput({ name: "ok" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.record.description).toBeNull();
  });
});

describe("computeGroupRoster", () => {
  const rows: GroupMemberRow[] = [
    { client_id: "c1", full_name: "Alice", status: "active" },
    { client_id: "c2", full_name: "Bob", status: "paused" },
    { client_id: "c3", full_name: "Carol", status: "active" },
    { client_id: "c4", full_name: null, status: "active" }
  ];

  test("counts by status", () => {
    const r = computeGroupRoster(rows);
    expect(r.total).toBe(4);
    expect(r.active).toBe(3);
    expect(r.paused).toBe(1);
  });

  test("sorts members alphabetically with unnamed last", () => {
    const r = computeGroupRoster(rows);
    expect(r.members.map((m) => m.full_name)).toEqual(["Alice", "Bob", "Carol", null]);
  });

  test("handles empty roster", () => {
    const r = computeGroupRoster([]);
    expect(r.total).toBe(0);
    expect(r.active).toBe(0);
    expect(r.members).toEqual([]);
  });
});
