"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prepareMiniSiteInput } from "@/lib/mini-site";

export async function saveMiniSite(formData: FormData) {
  const input = {
    headline: String(formData.get("headline") ?? ""),
    subheadline: String(formData.get("subheadline") ?? ""),
    cta_label: String(formData.get("cta_label") ?? "Book a call"),
    cta_url: String(formData.get("cta_url") ?? ""),
    bio: String(formData.get("bio") ?? "")
  };
  const prepared = prepareMiniSiteInput(input);
  if (!prepared.ok) redirect(`/app/mini-site?error=${encodeURIComponent(prepared.error)}`);

  const socialsRaw = String(formData.get("socials") ?? "");
  const social_urls = socialsRaw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id, slug")
    .eq("owner_id", user.id)
    .single();

  const { error } = await supabase.from("mini_site").upsert({
    workspace_id: workspace!.id,
    headline: prepared.record.headline,
    subheadline: prepared.record.subheadline,
    cta_label: prepared.record.cta_label,
    cta_url: prepared.record.cta_url,
    bio: prepared.record.bio,
    social_urls,
    updated_at: new Date().toISOString()
  });

  if (error) {
    console.error("[mini-site] save failed", error.message);
    redirect("/app/mini-site?error=save");
  }

  revalidatePath("/app/mini-site");
  if (workspace?.slug) revalidatePath(`/c/${workspace.slug}`);
  redirect("/app/mini-site?saved=1");
}
