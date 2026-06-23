import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { sendWelcomeEmail } from "./welcome-email";

describe("sendWelcomeEmail", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    process.env.RESEND_API_KEY = "test-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });

  test("posts to Resend with subject containing first name", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "abc123" })
    } as Response);
    global.fetch = fetchMock;

    const result = await sendWelcomeEmail({
      to: "jase@bba.com",
      name: "Jase Stuart",
      workspaceName: "BBA",
      loginUrl: "https://bbapt.vercel.app/app"
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.id).toBe("abc123");

    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body.to).toBe("jase@bba.com");
    expect(body.subject).toContain("Jase");
    expect(body.html).toContain("BBA");
    expect(body.html).toContain("https://bbapt.vercel.app/app");
  });

  test("falls back to 'Coach' when name is empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "x" })
    } as Response);
    global.fetch = fetchMock;

    await sendWelcomeEmail({
      to: "x@y.co",
      name: "",
      workspaceName: "BBA",
      loginUrl: "https://x.co"
    });

    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body.subject).toContain("Coach");
  });

  test("returns ok=false when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;

    const result = await sendWelcomeEmail({
      to: "x@y.co",
      name: "X",
      workspaceName: "W",
      loginUrl: "u"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("RESEND_API_KEY");
  });

  test("returns ok=false when Resend rejects", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => "domain not verified"
    } as unknown as Response);

    const result = await sendWelcomeEmail({
      to: "x@y.co",
      name: "X",
      workspaceName: "W",
      loginUrl: "u"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("422");
      expect(result.error).toContain("domain not verified");
    }
  });
});
