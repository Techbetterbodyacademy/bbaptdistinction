import { describe, test, expect } from "vitest";
import { slugifyWorkspaceName, generateUniqueSlug } from "./workspace-slug";

describe("slugifyWorkspaceName", () => {
  test("lowercases and dashes a normal name", () => {
    expect(slugifyWorkspaceName("Better Body Academy")).toBe("better-body-academy");
  });

  test("collapses repeated punctuation into a single dash", () => {
    expect(slugifyWorkspaceName("Better!!  Body @ Academy")).toBe("better-body-academy");
  });

  test("trims leading/trailing dashes", () => {
    expect(slugifyWorkspaceName("--BBA--")).toBe("bba");
  });

  test("caps at 48 chars", () => {
    expect(slugifyWorkspaceName("a".repeat(80)).length).toBeLessThanOrEqual(48);
  });

  test("falls back to 'workspace' when input is all punctuation", () => {
    expect(slugifyWorkspaceName("!!!")).toBe("workspace");
  });

  test("falls back to 'workspace' on empty input", () => {
    expect(slugifyWorkspaceName("")).toBe("workspace");
  });

  test("strips unicode (keeps a-z 0-9 only)", () => {
    expect(slugifyWorkspaceName("Café Académie")).toBe("caf-acad-mie");
  });
});

describe("generateUniqueSlug", () => {
  test("returns the base when it is available", async () => {
    const isUsed = async (s: string) => s === "taken";
    const result = await generateUniqueSlug("better-body-academy", isUsed);
    expect(result).toBe("better-body-academy");
  });

  test("appends a random suffix when base is taken", async () => {
    let calls = 0;
    const taken = new Set(["bba"]);
    const isUsed = async (s: string) => {
      calls++;
      return taken.has(s);
    };
    const result = await generateUniqueSlug("bba", isUsed);
    expect(result).not.toBe("bba");
    expect(result.startsWith("bba-")).toBe(true);
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  test("returns a guaranteed-unique slug after maxAttempts collisions", async () => {
    // Pretend every probed slug is already taken
    const isUsed = async () => true;
    const result = await generateUniqueSlug("bba", isUsed, { maxAttempts: 3 });
    expect(result.startsWith("bba-")).toBe(true);
    expect(result.length).toBeGreaterThan(4);
  });

  test("uses the UUID fallback length when all attempts fail", async () => {
    const isUsed = async () => true;
    const result = await generateUniqueSlug("bba", isUsed, { maxAttempts: 2 });
    // bba- + 8 hex chars
    expect(result.length).toBe(4 + 8);
  });

  test("the same input doesn't always produce the same suffix", async () => {
    const isUsed = async (s: string) => s === "bba";
    const results = await Promise.all([
      generateUniqueSlug("bba", isUsed),
      generateUniqueSlug("bba", isUsed),
      generateUniqueSlug("bba", isUsed)
    ]);
    const unique = new Set(results);
    // High probability of all-different across 3 calls
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });
});
