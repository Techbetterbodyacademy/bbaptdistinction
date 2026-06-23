import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseSocialLinks } from "@/lib/mini-site";

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "Twitter / X",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  other: "Link"
};

export default async function PublicMiniSitePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspace")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!workspace) notFound();

  const { data: site } = await supabase
    .from("mini_site")
    .select("headline, subheadline, cta_label, cta_url, bio, social_urls")
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!site) notFound();

  const socials = parseSocialLinks(Array.isArray(site.social_urls) ? (site.social_urls as string[]) : []);

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <header className="mb-10">
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-3">
            {workspace.name}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">{site.headline}</h1>
          {site.subheadline ? (
            <p className="text-[var(--color-muted)] mt-4 text-lg">{site.subheadline}</p>
          ) : null}
        </header>

        {site.bio ? (
          <section className="mb-10 text-left bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7">
            <p className="text-base whitespace-pre-wrap">{site.bio}</p>
          </section>
        ) : null}

        <a
          href={site.cta_url}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary text-lg px-8 py-3 inline-block mb-8"
        >
          {site.cta_label} &rarr;
        </a>

        {socials.length > 0 ? (
          <section>
            <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-3">
              Find me on
            </div>
            <ul className="flex flex-wrap justify-center gap-2">
              {socials.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block bg-[var(--color-surface)] border border-[var(--color-line)] rounded-full px-4 py-2 text-sm hover:border-[var(--color-blue)] transition-colors"
                  >
                    {PLATFORM_LABELS[s.platform]}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
