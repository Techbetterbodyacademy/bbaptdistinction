export type DocConfig = {
  slug: string;
  file: string;
  title: string;
  audience: string;
  blurb: string;
};

export const DOCS: DocConfig[] = [
  {
    slug: "walkthrough",
    file: "bbapt-walkthrough.md",
    title: "BBAPT Walkthrough",
    audience: "Coaches",
    blurb: "Full coach + client functionality audit. How to log in, dashboards, every feature, and what to test before going live."
  },
  {
    slug: "client-instructions",
    file: "bbapt-client-instructions.md",
    title: "Getting Started Guide",
    audience: "Clients",
    blurb: "Plain-language onboarding for new clients. Step-by-step for logging a workout, doing a check-in, reading your meal plan."
  },
  {
    slug: "landing-pages-context",
    file: "bba-landing-pages-context.md",
    title: "Landing Pages Project Context",
    audience: "Internal",
    blurb: "Brief for the upcoming BBA landing pages work. Brand constraints, Noy's role, proposed plan, open questions."
  }
];

export function getDocBySlug(slug: string): DocConfig | undefined {
  return DOCS.find((d) => d.slug === slug);
}
