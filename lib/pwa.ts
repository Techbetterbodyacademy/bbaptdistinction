export type ManifestIcon = {
  src: string;
  sizes: string;
  type: string;
  purpose: string;
};

export type WebManifest = {
  name: string;
  short_name: string;
  start_url: string;
  display: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  theme_color: string;
  background_color: string;
  icons: ManifestIcon[];
};

export type ManifestInput = {
  workspaceName: string;
  shortName?: string;
  themeColor: string;
  backgroundColor: string;
  icon192?: string;
  icon512?: string;
};

const DEFAULT_ICON_192 = "/bba-badge.png";
const DEFAULT_ICON_512 = "/bba-badge.png";

export function buildManifest(input: ManifestInput): WebManifest {
  const rawShort = input.shortName ?? input.workspaceName;
  const short_name = rawShort.length > 12 ? rawShort.slice(0, 12) : rawShort;
  return {
    name: input.workspaceName,
    short_name,
    start_url: "/app",
    display: "standalone",
    theme_color: input.themeColor,
    background_color: input.backgroundColor,
    icons: [
      {
        src: input.icon192 ?? DEFAULT_ICON_192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: input.icon512 ?? DEFAULT_ICON_512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ]
  };
}
