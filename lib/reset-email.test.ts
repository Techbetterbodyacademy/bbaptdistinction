import { describe, test, expect } from "vitest";
import { hashOtpCode, buildResetEmail } from "./reset-email";

describe("hashOtpCode", () => {
  test("produces deterministic SHA-256 hex", () => {
    expect(hashOtpCode("123456")).toBe(hashOtpCode("123456"));
  });

  test("different codes produce different hashes", () => {
    expect(hashOtpCode("123456")).not.toBe(hashOtpCode("654321"));
  });

  test("returns 64-char hex string", () => {
    const h = hashOtpCode("000000");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("buildResetEmail", () => {
  test("embeds the OTP code in the HTML body", () => {
    const { subject, html } = buildResetEmail("482913");
    expect(html).toContain("482913");
    expect(subject).toContain("482913");
  });

  test("subject mentions Better Body Academy", () => {
    const { subject } = buildResetEmail("000000");
    expect(subject).toContain("Better Body Academy");
  });

  test("HTML contains a safety footer about ignoring the email", () => {
    const { html } = buildResetEmail("123456");
    expect(html.toLowerCase()).toContain("ignore");
  });

  test("body does not include em-dashes (BBA voice rule)", () => {
    const { html } = buildResetEmail("123456");
    expect(html).not.toContain("—");
    expect(html).not.toContain("–");
  });
});
