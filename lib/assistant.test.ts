import { describe, test, expect } from "vitest";
import {
  prepareAssistantQuery,
  buildWorkspaceContext,
  buildAssistantPrompt,
  type WorkspaceSnapshot
} from "./assistant";

describe("prepareAssistantQuery", () => {
  test("returns trimmed question for valid input", () => {
    const result = prepareAssistantQuery("  How is Alice doing this week?  ");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question).toBe("How is Alice doing this week?");
  });

  test("rejects empty question", () => {
    const result = prepareAssistantQuery("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("question required");
  });

  test("rejects question over 1000 chars", () => {
    const result = prepareAssistantQuery("x".repeat(1001));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("question too long");
  });

  test("accepts question at exactly 1000 chars", () => {
    const result = prepareAssistantQuery("x".repeat(1000));
    expect(result.ok).toBe(true);
  });
});

describe("buildWorkspaceContext", () => {
  const snapshot: WorkspaceSnapshot = {
    workspaceName: "BBA",
    clients: [
      { full_name: "Alice", status: "active", last_checkin_at: "2026-06-10T12:00:00Z" },
      { full_name: "Bob", status: "paused", last_checkin_at: null }
    ],
    programs: [
      { name: "Foundations 12-week", weeks: 12 }
    ],
    recentWorkouts: 14,
    overdueCheckins: 3
  };

  test("includes workspace name + counts", () => {
    const ctx = buildWorkspaceContext(snapshot);
    expect(ctx).toContain("BBA");
    expect(ctx).toContain("2 clients");
    expect(ctx).toContain("1 program");
    expect(ctx).toContain("14 workouts");
    expect(ctx).toContain("3 overdue");
  });

  test("lists each client with status", () => {
    const ctx = buildWorkspaceContext(snapshot);
    expect(ctx).toContain("Alice");
    expect(ctx).toContain("active");
    expect(ctx).toContain("Bob");
    expect(ctx).toContain("paused");
  });

  test("handles empty workspace gracefully", () => {
    const ctx = buildWorkspaceContext({
      workspaceName: "Empty",
      clients: [],
      programs: [],
      recentWorkouts: 0,
      overdueCheckins: 0
    });
    expect(ctx).toContain("Empty");
    expect(ctx).toContain("0 clients");
  });

  test("truncates to 4000 chars max", () => {
    const big: WorkspaceSnapshot = {
      workspaceName: "Big",
      clients: Array.from({ length: 500 }, (_, i) => ({
        full_name: `Client ${i}`,
        status: "active" as const,
        last_checkin_at: null
      })),
      programs: [],
      recentWorkouts: 0,
      overdueCheckins: 0
    };
    const ctx = buildWorkspaceContext(big);
    expect(ctx.length).toBeLessThanOrEqual(4000);
  });
});

describe("buildAssistantPrompt", () => {
  test("returns system + user messages with question and context", () => {
    const messages = buildAssistantPrompt({
      question: "How is Alice?",
      context: "BBA has 2 clients."
    });
    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
    expect(messages[1].content).toContain("How is Alice?");
    expect(messages[1].content).toContain("BBA has 2 clients.");
  });

  test("system prompt warns against em-dashes (BBA voice)", () => {
    const messages = buildAssistantPrompt({ question: "x", context: "y" });
    expect(messages[0].content).toContain("em-dash");
  });
});
