import { describe, test, expect } from "vitest";
import { prepareTrainerInvite, canPerform, type TrainerRole } from "./trainer-access";

describe("prepareTrainerInvite", () => {
  test("clean invite for valid input", () => {
    const r = prepareTrainerInvite({
      email: "  Coach@Example.com  ",
      role: "trainer",
      full_name: "  Jane Coach  "
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.record.email).toBe("coach@example.com");
      expect(r.record.full_name).toBe("Jane Coach");
      expect(r.record.role).toBe("trainer");
    }
  });

  test("lowercases email", () => {
    const r = prepareTrainerInvite({ email: "BIG@EX.COM", role: "trainer" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.record.email).toBe("big@ex.com");
  });

  test("rejects invalid email", () => {
    const r = prepareTrainerInvite({ email: "not-an-email", role: "trainer" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/email/i);
  });

  test("rejects empty email", () => {
    const r = prepareTrainerInvite({ email: " ", role: "trainer" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/email/i);
  });

  test("rejects invalid role", () => {
    const r = prepareTrainerInvite({ email: "a@b.co", role: "magic" as never });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/role/i);
  });

  test("full_name is optional", () => {
    const r = prepareTrainerInvite({ email: "a@b.co", role: "trainer" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.record.full_name).toBeNull();
  });
});

describe("canPerform", () => {
  test("owner can do everything", () => {
    const role: TrainerRole = "owner";
    expect(canPerform(role, "manage_clients")).toBe(true);
    expect(canPerform(role, "manage_billing")).toBe(true);
    expect(canPerform(role, "invite_trainers")).toBe(true);
    expect(canPerform(role, "edit_settings")).toBe(true);
  });

  test("trainer can manage clients but not billing or settings", () => {
    const role: TrainerRole = "trainer";
    expect(canPerform(role, "manage_clients")).toBe(true);
    expect(canPerform(role, "manage_billing")).toBe(false);
    expect(canPerform(role, "invite_trainers")).toBe(false);
    expect(canPerform(role, "edit_settings")).toBe(false);
  });

  test("assistant can view clients but not manage them", () => {
    const role: TrainerRole = "assistant";
    expect(canPerform(role, "view_clients")).toBe(true);
    expect(canPerform(role, "manage_clients")).toBe(false);
    expect(canPerform(role, "manage_billing")).toBe(false);
  });

  test("unknown permission defaults to false", () => {
    expect(canPerform("owner", "unknown_perm" as never)).toBe(false);
  });
});
