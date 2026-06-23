"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteEntry(formData: FormData) {
  const entryId = String(formData.get("entry_id") ?? "");
  if (!entryId) {
    redirect("/client/logbook");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: clientProfile } = await supabase
    .from("client_profile")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!clientProfile) {
    redirect("/client");
  }

  const { data: photos } = await supabase
    .from("transformation_photo")
    .select("blob_url")
    .eq("entry_id", entryId)
    .eq("client_id", clientProfile.id);

  const paths = (photos ?? []).map((p) => p.blob_url).filter(Boolean) as string[];
  if (paths.length > 0) {
    await supabase.storage.from("transformations").remove(paths);
  }

  await supabase
    .from("transformation_entry")
    .delete()
    .eq("id", entryId)
    .eq("client_id", clientProfile.id);

  revalidatePath("/client/logbook");
  redirect("/client/logbook");
}
