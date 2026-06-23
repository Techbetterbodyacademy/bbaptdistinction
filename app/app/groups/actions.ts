"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prepareGroupInput } from "@/lib/groups";

export async function createGroup(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "");

  const prepared = prepareGroupInput({ name, description });
  if (!prepared.ok) {
    redirect(`/app/groups?error=${prepared.error === "name required" ? "name" : "save"}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  const { error } = await supabase.from("client_group").insert({
    workspace_id: workspace!.id,
    name: prepared.record.name,
    description: prepared.record.description,
    created_by: user.id
  });

  if (error) {
    console.error("[group] insert failed", { message: error.message, code: error.code });
    redirect("/app/groups?error=save");
  }

  revalidatePath("/app/groups");
  redirect("/app/groups?saved=1");
}
