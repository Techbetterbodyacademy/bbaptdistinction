"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prepareScheduledMessage } from "@/lib/scheduled-message";

export async function scheduleMessageAsCoach(formData: FormData) {
  const threadId = String(formData.get("thread_id") ?? "");
  const body = String(formData.get("body") ?? "");
  const scheduledFor = String(formData.get("scheduled_for") ?? "");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const prepared = prepareScheduledMessage({
    thread_id: threadId,
    sender_user_id: user.id,
    body,
    scheduled_for: new Date(scheduledFor).toISOString()
  });

  if (!prepared.ok) {
    redirect(`/app/messages/${threadId}?error=${encodeURIComponent(prepared.error)}`);
  }

  // Look up workspace_id from the thread so we can store it on the scheduled_message
  const { data: thread } = await supabase
    .from("message_thread")
    .select("workspace_id")
    .eq("id", threadId)
    .maybeSingle();

  if (!thread) {
    redirect(`/app/messages/${threadId}?error=thread-not-found`);
  }

  const { error } = await supabase.from("scheduled_message").insert({
    thread_id: threadId,
    workspace_id: thread.workspace_id,
    sender_user_id: user.id,
    body: prepared.record.body,
    scheduled_for: prepared.record.scheduled_for
  });

  if (error) {
    console.error("[schedule-message] insert failed", { message: error.message, code: error.code });
    redirect(`/app/messages/${threadId}?error=insert`);
  }

  revalidatePath(`/app/messages/${threadId}`);
  redirect(`/app/messages/${threadId}?scheduled=1`);
}

export async function cancelScheduledMessage(formData: FormData) {
  const threadId = String(formData.get("thread_id") ?? "");
  const scheduledId = String(formData.get("scheduled_id") ?? "");
  if (!threadId || !scheduledId) redirect(`/app/messages/${threadId}`);

  const supabase = await createClient();
  await supabase
    .from("scheduled_message")
    .update({ status: "cancelled" })
    .eq("id", scheduledId)
    .eq("status", "pending");

  revalidatePath(`/app/messages/${threadId}`);
  redirect(`/app/messages/${threadId}`);
}
