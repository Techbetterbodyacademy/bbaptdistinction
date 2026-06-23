"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addMember(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!groupId || !clientId) redirect(`/app/groups/${groupId}`);

  const supabase = await createClient();
  await supabase.from("client_group_member").insert({ group_id: groupId, client_id: clientId });
  revalidatePath(`/app/groups/${groupId}`);
  redirect(`/app/groups/${groupId}`);
}

export async function removeMember(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  if (!groupId || !memberId) redirect(`/app/groups/${groupId}`);

  const supabase = await createClient();
  await supabase.from("client_group_member").delete().eq("id", memberId);
  revalidatePath(`/app/groups/${groupId}`);
  redirect(`/app/groups/${groupId}`);
}

export async function deleteGroup(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  if (!groupId) redirect("/app/groups");

  const supabase = await createClient();
  await supabase.from("client_group").delete().eq("id", groupId);
  revalidatePath("/app/groups");
  redirect("/app/groups");
}
