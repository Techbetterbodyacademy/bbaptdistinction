"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createProgram(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const weeks = Math.max(1, Math.min(52, Number(formData.get("weeks") ?? 12) || 12));
  const audience = String(formData.get("audience") ?? "mixed");

  if (!name) {
    redirect("/app/programs/new?error=missing");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  const { data: created, error } = await supabase
    .from("program")
    .insert({
      workspace_id: workspace!.id,
      name,
      description,
      weeks,
      audience,
      status: "draft",
      created_by: user.id
    })
    .select("id")
    .single();

  if (error || !created) {
    redirect("/app/programs/new?error=insert");
  }

  redirect(`/app/programs/${created.id}`);
}
