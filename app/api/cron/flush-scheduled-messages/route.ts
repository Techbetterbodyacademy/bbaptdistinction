import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { partitionDueScheduledMessages, type ScheduledRow } from "@/lib/scheduled-message-batch";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();

  // Pull up to 200 pending in one batch, filter by status defensively
  const { data, error } = await supabase
    .from("scheduled_message")
    .select("id, thread_id, sender_user_id, body, scheduled_for, status")
    .in("status", ["pending"])
    .lte("scheduled_for", now.toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const partition = partitionDueScheduledMessages((data ?? []) as ScheduledRow[], now);

  let sent = 0;
  const failures: Array<{ id: string; reason: string }> = [];

  for (const row of partition.due) {
    const { data: inserted, error: insertError } = await supabase
      .from("message")
      .insert({
        thread_id: row.thread_id,
        sender: "coach",
        sender_user_id: row.sender_user_id,
        body: row.body
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      failures.push({ id: row.id, reason: insertError?.message ?? "no row returned" });
      continue;
    }

    await supabase
      .from("scheduled_message")
      .update({
        status: "sent",
        sent_at: now.toISOString(),
        sent_message_id: inserted.id
      })
      .eq("id", row.id);

    sent++;
  }

  return NextResponse.json({
    sent,
    failures,
    due_count: partition.due.length,
    not_yet_count: partition.notYet.length
  });
}
