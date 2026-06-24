"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sendMessageAsClient(formData: FormData) {
  const threadId = String(formData.get("thread_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const replyToRaw = String(formData.get("reply_to_id") ?? "");
  const replyToId = replyToRaw && replyToRaw.length === 36 ? replyToRaw : null;
  if (!threadId || !body) redirect("/client/messages");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("message").insert({
    thread_id: threadId,
    sender: "client",
    sender_user_id: user.id,
    body,
    reply_to_id: replyToId
  });

  if (error) {
    console.error("[message] client send failed", { message: error.message, code: error.code });
    redirect("/client/messages?error=send");
  }

  revalidatePath("/client/messages");
  redirect("/client/messages");
}
