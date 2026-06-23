import { describe, test, expect } from "vitest";
import { preparePasswordChange } from "./password-change";

describe("preparePasswordChange", () => {
  test("accepts a valid new password with matching confirmation", () => {
    const r = preparePasswordChange({ password: "strongpass123", confirm: "strongpass123" });
    expect(r.ok).toBe(true);
  });

  test("rejects password under 8 chars", () => {
    const r = preparePasswordChange({ password: "short1", confirm: "short1" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/8/);
  });

  test("rejects empty password", () => {
    const r = preparePasswordChange({ password: "", confirm: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/required/i);
  });

  test("rejects when confirmation does not match", () => {
    const r = preparePasswordChange({ password: "validpass123", confirm: "validpass124" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/match/i);
  });

  test("accepts at exactly 8 chars", () => {
    const r = preparePasswordChange({ password: "12345678", confirm: "12345678" });
    expect(r.ok).toBe(true);
  });

  test("rejects password over 72 chars (bcrypt limit)", () => {
    const r = preparePasswordChange({ password: "a".repeat(73), confirm: "a".repeat(73) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/72/);
  });
});
