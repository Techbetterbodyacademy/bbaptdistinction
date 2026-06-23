"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prepareFormInput } from "@/lib/forms";

export async function createForm(formData: FormData) {
  const input = {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "")
  };
  const prepared = prepareFormInput(input);
  if (!prepared.ok) redirect(`/app/forms?error=${encodeURIComponent(prepared.error)}`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  const { data: created, error } = await supabase
    .from("form")
    .insert({
      workspace_id: workspace!.id,
      title: prepared.record.title,
      description: prepared.record.description,
      created_by: user.id
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("[form] insert failed", error?.message);
    redirect("/app/forms?error=save");
  }

  revalidatePath("/app/forms");
  redirect(`/app/forms/${created.id}`);
}
