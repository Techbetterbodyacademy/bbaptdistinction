"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { slugifyWorkspaceName, generateUniqueSlug } from "@/lib/workspace-slug";

function audienceToTag(value: string): "men-40-60" | "women-35-60" | "mixed" {
  if (value === "men") return "men-40-60";
  if (value === "women") return "women-35-60";
  return "mixed";
}

export async function createWorkspace(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const coachName = String(formData.get("coach_name") ?? "").trim();
  const audience = String(formData.get("audience") ?? "men");

  if (!name || !coachName) {
    redirect("/onboarding?error=missing");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Use service role for the slug clash check so RLS doesn't hide existing workspaces.
  const service = createServiceClient();

  const slug = await generateUniqueSlug(slugifyWorkspaceName(name), async (candidate) => {
    const { data: clash } = await service
      .from("workspace")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    return clash !== null;
  });

  const { error: insertError } = await supabase.from("workspace").insert({
    owner_id: user.id,
    name,
    slug,
    coach_name: coachName,
    brand_audience: audienceToTag(audience),
    primary_color: "#00AEEF"
  });

  if (insertError) {
    console.error("[onboarding] workspace insert failed", {
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
      code: insertError.code,
      attemptedSlug: slug
    });
    redirect("/onboarding?error=insert");
  }

  redirect("/app");
}
