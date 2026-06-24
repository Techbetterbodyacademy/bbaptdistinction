"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sendMessageAsCoach(formData: FormData) {
  const threadId = String(formData.get("thread_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const replyToRaw = String(formData.get("reply_to_id") ?? "");
  const replyToId = replyToRaw && replyToRaw.length === 36 ? replyToRaw : null;
  if (!threadId || !body) redirect(`/app/messages/${threadId}`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("message").insert({
    thread_id: threadId,
    sender: "coach",
    sender_user_id: user.id,
    body,
    reply_to_id: replyToId
  });

  if (error) {
    console.error("[message] coach send failed", { message: error.message, code: error.code });
    redirect(`/app/messages/${threadId}?error=send`);
  }

  revalidatePath(`/app/messages/${threadId}`);
  revalidatePath("/app/messages");
  redirect(`/app/messages/${threadId}`);
}

export async function markThreadRead(formData: FormData) {
  const threadId = String(formData.get("thread_id") ?? "");
  if (!threadId) return;

  const supabase = await createClient();
  await supabase
    .from("message_thread")
    .update({ coach_last_read_at: new Date().toISOString() })
    .eq("id", threadId);

  revalidatePath("/app/messages");
}
