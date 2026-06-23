import { describe, test, expect } from "vitest";
import { generateOtpCode, isOtpExpired, normalizeEmail } from "./email-otp";

describe("generateOtpCode", () => {
  test("returns a 6-digit numeric string", () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  test("generates different codes across calls", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateOtpCode()));
    // With ~1,000,000 possible codes, 50 calls should produce many unique values
    expect(codes.size).toBeGreaterThan(40);
  });
});

describe("isOtpExpired", () => {
  test("returns false within the TTL window", () => {
    const issuedAt = new Date("2026-06-12T12:00:00Z");
    const now = new Date("2026-06-12T12:09:59Z"); // 9:59 later
    expect(isOtpExpired(issuedAt, now, 600)).toBe(false);
  });

  test("returns true past the TTL window", () => {
    const issuedAt = new Date("2026-06-12T12:00:00Z");
    const now = new Date("2026-06-12T12:10:01Z"); // 10:01 later
    expect(isOtpExpired(issuedAt, now, 600)).toBe(true);
  });

  test("default TTL is 10 minutes", () => {
    const issuedAt = new Date("2026-06-12T12:00:00Z");
    const justUnder = new Date("2026-06-12T12:09:59Z");
    const justOver = new Date("2026-06-12T12:10:01Z");
    expect(isOtpExpired(issuedAt, justUnder)).toBe(false);
    expect(isOtpExpired(issuedAt, justOver)).toBe(true);
  });
});

describe("normalizeEmail", () => {
  test("trims and lowercases", () => {
    expect(normalizeEmail("  JASE@BBA.COM  ")).toBe("jase@bba.com");
  });

  test("returns empty for empty input", () => {
    expect(normalizeEmail("  ")).toBe("");
  });
});
