import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { generateText } from "./ai";

describe("generateText", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  test("returns ok=false when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await generateText({ messages: [{ role: "user", content: "hi" }] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("OPENAI_API_KEY");
  });

  test("returns text from OpenAI response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "Hello, coach." } }] })
    } as Response);

    const result = await generateText({ messages: [{ role: "user", content: "hi" }] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toBe("Hello, coach.");
  });

  test("returns ok=false when API errors", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "server boom"
    } as unknown as Response);

    const result = await generateText({ messages: [{ role: "user", content: "hi" }] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("500");
      expect(result.error).toContain("server boom");
    }
  });

  test("returns ok=false when response has no content", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] })
    } as Response);

    const result = await generateText({ messages: [{ role: "user", content: "hi" }] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/no content/i);
  });

  test("does NOT request JSON response format (free-form text)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "ok" } }] })
    } as Response);
    global.fetch = fetchMock;

    await generateText({ messages: [{ role: "user", content: "hi" }] });

    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body.response_format).toBeUndefined();
  });
});
