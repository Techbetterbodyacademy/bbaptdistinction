export type MiniSiteInput = {
  headline: string;
  subheadline?: string;
  cta_label: string;
  cta_url: string;
  bio?: string;
};

export type MiniSiteRecord = {
  headline: string;
  subheadline: string | null;
  cta_label: string;
  cta_url: string;
  bio: string | null;
};

export type PrepareResult<T> = { ok: true; record: T } | { ok: false; error: string };

function isUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function prepareMiniSiteInput(input: MiniSiteInput): PrepareResult<MiniSiteRecord> {
  const headline = input.headline.trim();
  if (!headline) return { ok: false, error: "headline required" };
  const cta_label = input.cta_label.trim();
  if (!cta_label) return { ok: false, error: "cta_label required" };
  const cta_url = input.cta_url.trim();
  if (!isUrl(cta_url)) return { ok: false, error: "cta_url must be a valid http(s) URL" };
  const sub = input.subheadline?.trim() ?? "";
  const bio = input.bio?.trim() ?? "";
  return {
    ok: true,
    record: {
      headline,
      subheadline: sub.length ? sub : null,
      cta_label,
      cta_url,
      bio: bio.length ? bio : null
    }
  };
}

export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "twitter"
  | "facebook"
  | "linkedin"
  | "other";

export type SocialLink = {
  platform: SocialPlatform;
  url: string;
};

const HOST_PATTERNS: Array<{ host: RegExp; platform: SocialPlatform }> = [
  { host: /(^|\.)instagram\.com$/i, platform: "instagram" },
  { host: /(^|\.)tiktok\.com$/i, platform: "tiktok" },
  { host: /(^|\.)youtube\.com$/i, platform: "youtube" },
  { host: /(^|\.)youtu\.be$/i, platform: "youtube" },
  { host: /(^|\.)twitter\.com$/i, platform: "twitter" },
  { host: /(^|\.)x\.com$/i, platform: "twitter" },
  { host: /(^|\.)facebook\.com$/i, platform: "facebook" },
  { host: /(^|\.)linkedin\.com$/i, platform: "linkedin" }
];

export function parseSocialLinks(urls: string[]): SocialLink[] {
  const links: SocialLink[] = [];
  for (const raw of urls) {
    const url = raw.trim();
    if (!url) continue;
    if (!isUrl(url)) continue;
    const host = new URL(url).hostname;
    const match = HOST_PATTERNS.find((p) => p.host.test(host));
    links.push({ platform: match?.platform ?? "other", url });
  }
  return links;
}
