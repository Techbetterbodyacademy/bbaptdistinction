import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { saveMiniSite } from "./actions";

export default async function MiniSiteEditorPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id, slug, name")
    .eq("owner_id", user!.id)
    .single();

  const { data: site } = await supabase
    .from("mini_site")
    .select("headline, subheadline, cta_label, cta_url, bio, social_urls")
    .eq("workspace_id", workspace!.id)
    .maybeSingle();

  const socials = Array.isArray(site?.social_urls) ? (site!.social_urls as string[]) : [];

  return (
    <main className="px-10 py-10 max-w-3xl">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
            Public page
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Mini site</h1>
          <p className="text-[var(--color-muted)] mt-2">A single page that introduces you and points to a CTA.</p>
        </div>
        {workspace?.slug ? (
          <Link href={`/c/${workspace.slug}`} target="_blank" className="btn btn-ghost text-sm shrink-0">
            View public page &rarr;
          </Link>
        ) : null}
      </header>

      {sp.saved === "1" ? <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Saved.</div> : null}
      {sp.error ? <div className="mb-6 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm">{sp.error}</div> : null}

      <form action={saveMiniSite} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7 space-y-5">
        <div>
          <label className="label" htmlFor="headline">Headline</label>
          <input id="headline" name="headline" required defaultValue={site?.headline ?? workspace?.name ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="subheadline">Sub-headline</label>
          <input id="subheadline" name="subheadline" defaultValue={site?.subheadline ?? ""} placeholder="Helping men 40-60 build strength and lose fat" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="bio">Bio</label>
          <textarea id="bio" name="bio" rows={4} defaultValue={site?.bio ?? ""} placeholder="A short bio. Who you help and how." className="input resize-y" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="cta_label">CTA label</label>
            <input id="cta_label" name="cta_label" required defaultValue={site?.cta_label ?? "Book a call"} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="cta_url">CTA URL</label>
            <input id="cta_url" name="cta_url" type="url" required defaultValue={site?.cta_url ?? ""} placeholder="https://cal.com/your-handle" className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="socials">Social links (one per line)</label>
          <textarea
            id="socials"
            name="socials"
            rows={5}
            defaultValue={socials.join("\n")}
            placeholder={"https://instagram.com/handle\nhttps://tiktok.com/@handle"}
            className="input resize-y"
          />
        </div>
        <button type="submit" className="btn btn-primary">Save mini site</button>
      </form>
    </main>
  );
}
