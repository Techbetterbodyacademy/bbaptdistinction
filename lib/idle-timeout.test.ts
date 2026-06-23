import { describe, test, expect } from "vitest";
import {
  IDLE_TIMEOUT_MS,
  WARNING_BEFORE_MS,
  computeIdleState,
  formatRemaining
} from "./idle-timeout";

describe("IDLE_TIMEOUT_MS", () => {
  test("is 30 minutes", () => {
    expect(IDLE_TIMEOUT_MS).toBe(30 * 60 * 1000);
  });

  test("warning fires 2 minutes before timeout", () => {
    expect(WARNING_BEFORE_MS).toBe(2 * 60 * 1000);
  });
});

describe("computeIdleState", () => {
  const last = new Date("2026-06-16T12:00:00Z").getTime();

  test("'active' when last activity is recent", () => {
    const now = last + 60 * 1000;
    const r = computeIdleState(last, now);
    expect(r.state).toBe("active");
    expect(r.remainingMs).toBe(IDLE_TIMEOUT_MS - 60 * 1000);
  });

  test("'warning' when within 2 min of timeout", () => {
    const now = last + IDLE_TIMEOUT_MS - 60 * 1000;
    const r = computeIdleState(last, now);
    expect(r.state).toBe("warning");
    expect(r.remainingMs).toBe(60 * 1000);
  });

  test("'expired' at the exact timeout moment", () => {
    const now = last + IDLE_TIMEOUT_MS;
    expect(computeIdleState(last, now).state).toBe("expired");
  });

  test("'expired' past the timeout", () => {
    const now = last + IDLE_TIMEOUT_MS + 5_000;
    const r = computeIdleState(last, now);
    expect(r.state).toBe("expired");
    expect(r.remainingMs).toBe(0);
  });

  test("warning starts exactly at WARNING_BEFORE_MS remaining", () => {
    const now = last + IDLE_TIMEOUT_MS - WARNING_BEFORE_MS;
    expect(computeIdleState(last, now).state).toBe("warning");
  });

  test("never returns negative remaining time", () => {
    const now = last + 5 * IDLE_TIMEOUT_MS;
    const r = computeIdleState(last, now);
    expect(r.remainingMs).toBe(0);
  });
});

describe("formatRemaining", () => {
  test("formats minutes + seconds", () => {
    expect(formatRemaining(125_000)).toBe("2:05");
  });

  test("zero-pads single-digit seconds", () => {
    expect(formatRemaining(65_000)).toBe("1:05");
  });

  test("shows 0:00 when expired", () => {
    expect(formatRemaining(0)).toBe("0:00");
  });

  test("rounds down sub-second remainder", () => {
    expect(formatRemaining(59_999)).toBe("0:59");
  });
});
