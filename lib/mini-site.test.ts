import { describe, test, expect } from "vitest";
import { prepareMiniSiteInput, parseSocialLinks, type SocialPlatform } from "./mini-site";

describe("prepareMiniSiteInput", () => {
  test("clean record for valid input", () => {
    const r = prepareMiniSiteInput({
      headline: "  Coach Jane  ",
      subheadline: "  Helping men 40-60 build strength  ",
      cta_label: "  Book a call  ",
      cta_url: "https://cal.com/jane",
      bio: "  20 years in strength training  "
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.record.headline).toBe("Coach Jane");
      expect(r.record.cta_label).toBe("Book a call");
      expect(r.record.cta_url).toBe("https://cal.com/jane");
    }
  });

  test("rejects empty headline", () => {
    const r = prepareMiniSiteInput({
      headline: " ",
      cta_label: "x",
      cta_url: "https://x.com"
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/headline/i);
  });

  test("rejects invalid cta_url", () => {
    const r = prepareMiniSiteInput({
      headline: "x",
      cta_label: "y",
      cta_url: "not-a-url"
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/url/i);
  });

  test("accepts http and https", () => {
    expect(prepareMiniSiteInput({ headline: "x", cta_label: "y", cta_url: "http://a.co" }).ok).toBe(true);
    expect(prepareMiniSiteInput({ headline: "x", cta_label: "y", cta_url: "https://a.co" }).ok).toBe(true);
  });

  test("subheadline and bio are optional", () => {
    const r = prepareMiniSiteInput({ headline: "x", cta_label: "y", cta_url: "https://a.co" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.record.subheadline).toBeNull();
      expect(r.record.bio).toBeNull();
    }
  });
});

describe("parseSocialLinks", () => {
  test("extracts known platforms from urls", () => {
    const links = parseSocialLinks([
      "https://instagram.com/coachjane",
      "https://www.tiktok.com/@coachjane",
      "https://youtube.com/@coachjane",
      "https://twitter.com/coachjane",
      "https://x.com/coachjane",
      "https://facebook.com/coachjane",
      "https://cal.com/jane"
    ]);
    const platforms = links.map((l) => l.platform);
    expect(platforms).toContain("instagram");
    expect(platforms).toContain("tiktok");
    expect(platforms).toContain("youtube");
    expect(platforms).toContain("twitter");
    expect(platforms).toContain("facebook");
    expect(platforms).toContain("other");
  });

  test("classifies x.com as twitter", () => {
    const links = parseSocialLinks(["https://x.com/coachjane"]);
    expect(links[0].platform).toBe("twitter");
  });

  test("skips empty entries", () => {
    const links = parseSocialLinks(["", "  ", "https://instagram.com/jane"]);
    expect(links.length).toBe(1);
  });

  test("returns the cleaned url", () => {
    const links = parseSocialLinks(["  https://instagram.com/jane  "]);
    expect(links[0].url).toBe("https://instagram.com/jane");
  });

  test("invalid urls are dropped", () => {
    const links = parseSocialLinks(["not a url", "https://valid.com"]);
    expect(links.length).toBe(1);
  });
});

describe("platform inference", () => {
  test.each<[string, SocialPlatform]>([
    ["https://www.instagram.com/jane/", "instagram"],
    ["https://m.tiktok.com/@jane", "tiktok"],
    ["https://youtu.be/abc", "youtube"],
    ["https://m.facebook.com/jane", "facebook"],
    ["https://linkedin.com/in/jane", "linkedin"]
  ])("%s → %s", (url, expected) => {
    const links = parseSocialLinks([url]);
    expect(links[0].platform).toBe(expected);
  });
});
