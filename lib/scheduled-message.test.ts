import { describe, test, expect } from "vitest";
import { prepareScheduledMessage } from "./scheduled-message";

describe("prepareScheduledMessage", () => {
  const validThread = "00000000-0000-0000-0000-000000000001";
  const validUser = "00000000-0000-0000-0000-000000000002";
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  test("returns a clean record when given valid input", () => {
    const result = prepareScheduledMessage({
      thread_id: validThread,
      sender_user_id: validUser,
      body: "Monday motivation: lift heavy.",
      scheduled_for: future
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.thread_id).toBe(validThread);
      expect(result.record.body).toBe("Monday motivation: lift heavy.");
      expect(result.record.scheduled_for).toBe(future);
      expect(result.record.status).toBe("pending");
    }
  });

  test("rejects empty body", () => {
    const result = prepareScheduledMessage({
      thread_id: validThread,
      sender_user_id: validUser,
      body: "   ",
      scheduled_for: future
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("body required");
  });

  test("rejects past scheduled_for", () => {
    const past = new Date(Date.now() - 60 * 1000).toISOString();
    const result = prepareScheduledMessage({
      thread_id: validThread,
      sender_user_id: validUser,
      body: "too late",
      scheduled_for: past
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("scheduled_for must be in the future");
  });

  test("rejects invalid scheduled_for", () => {
    const result = prepareScheduledMessage({
      thread_id: validThread,
      sender_user_id: validUser,
      body: "ok body",
      scheduled_for: "not a date"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("scheduled_for must be a valid ISO date");
  });

  test("rejects missing thread_id", () => {
    const result = prepareScheduledMessage({
      thread_id: "",
      sender_user_id: validUser,
      body: "ok",
      scheduled_for: future
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("thread_id required");
  });

  test("trims body whitespace", () => {
    const result = prepareScheduledMessage({
      thread_id: validThread,
      sender_user_id: validUser,
      body: "  hey  \n",
      scheduled_for: future
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.record.body).toBe("hey");
  });
});
