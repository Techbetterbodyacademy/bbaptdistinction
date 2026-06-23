import { describe, test, expect } from "vitest";
import { buildManifest } from "./pwa";

describe("buildManifest", () => {
  test("returns standard PWA manifest shape", () => {
    const m = buildManifest({
      workspaceName: "BBA Coaching",
      shortName: "BBA",
      themeColor: "#0A0A0A",
      backgroundColor: "#0A0A0A",
      icon192: "https://example.com/icon-192.png",
      icon512: "https://example.com/icon-512.png"
    });
    expect(m.name).toBe("BBA Coaching");
    expect(m.short_name).toBe("BBA");
    expect(m.theme_color).toBe("#0A0A0A");
    expect(m.background_color).toBe("#0A0A0A");
    expect(m.start_url).toBe("/app");
    expect(m.display).toBe("standalone");
    expect(m.icons).toHaveLength(2);
    expect(m.icons[0].sizes).toBe("192x192");
    expect(m.icons[1].sizes).toBe("512x512");
  });

  test("falls back to workspace name when short_name not given", () => {
    const m = buildManifest({
      workspaceName: "BBA",
      themeColor: "#000",
      backgroundColor: "#000"
    });
    expect(m.short_name).toBe("BBA");
  });

  test("truncates short_name to 12 chars (Android limit)", () => {
    const m = buildManifest({
      workspaceName: "Better Body Academy Coaching",
      themeColor: "#000",
      backgroundColor: "#000"
    });
    expect(m.short_name.length).toBeLessThanOrEqual(12);
  });

  test("uses default BBA icons when none provided", () => {
    const m = buildManifest({
      workspaceName: "BBA",
      themeColor: "#000",
      backgroundColor: "#000"
    });
    expect(m.icons[0].src).toContain("bba-badge");
  });

  test("icon entries declare purpose any maskable", () => {
    const m = buildManifest({
      workspaceName: "BBA",
      themeColor: "#000",
      backgroundColor: "#000"
    });
    expect(m.icons[0].purpose).toContain("any");
    expect(m.icons[0].purpose).toContain("maskable");
  });
});
