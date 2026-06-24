import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendMessageAsCoach } from "./actions";
import { scheduleMessageAsCoach, cancelScheduledMessage } from "./schedule-actions";
import { MessageThread } from "@/components/messages/message-thread";
import { Avatar } from "@/components/avatar";

export default async function CoachThreadPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: threadId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const { data: thread } = await supabase
    .from("message_thread")
    .select(`
      id, client_id, workspace_id,
      client:client_id(id, user_profile:user_id(full_name, avatar_url))
    `)
    .eq("id", threadId)
    .eq("workspace_id", workspace!.id)
    .maybeSingle();

  if (!thread) notFound();

  const [{ data: messages }, { data: scheduled }] = await Promise.all([
    supabase
      .from("message")
      .select("id, sender, body, created_at, sender_user_id, reply_to_id")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("scheduled_message")
      .select("id, body, scheduled_for")
      .eq("thread_id", thread.id)
      .eq("status", "pending")
      .order("scheduled_for", { ascending: true })
  ]);

  // Mark as read on every coach load
  await supabase
    .from("message_thread")
    .update({ coach_last_read_at: new Date().toISOString() })
    .eq("id", thread.id);

  const client = Array.isArray(thread.client) ? thread.client[0] : thread.client;
  const profile = client ? (Array.isArray(client.user_profile) ? client.user_profile[0] : client.user_profile) : null;
  const name = profile?.full_name ?? "Client";
  const avatarUrl = (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null;

  const initialMessages = (messages ?? []).map((m) => ({
    id: m.id,
    sender: (m.sender === "coach" ? "coach" : "client") as "coach" | "client",
    body: m.body,
    created_at: m.created_at,
    reply_to_id: m.reply_to_id ?? null
  }));

  return (
    <main className="w-full flex flex-col" style={{ minHeight: "calc(100vh - 0px)" }}>
      <div className="px-4 sm:px-6 lg:px-10 py-6">
        <Link href="/app/messages" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
          &larr; Inbox
        </Link>

        <header className="flex items-center justify-between mt-4 mb-2 pb-4 border-b border-[var(--color-line)] gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar url={avatarUrl} name={name} size="lg" />
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-1">
                Conversation
              </div>
              <h1 className="text-xl font-extrabold tracking-tight truncate">{name}</h1>
            </div>
          </div>
          <Link href={`/app/clients/${thread.client_id}`} className="btn btn-ghost text-sm">
            View profile
          </Link>
        </header>
      </div>

      <MessageThread
        threadId={thread.id}
        initialMessages={initialMessages}
        mySide="coach"
        sendAction={sendMessageAsCoach}
        emptyHint="Start the conversation. Say hi, ask about their week, share a quick tip."
      />

      {scheduled && scheduled.length > 0 ? (
        <section className="mb-4 px-4 sm:px-6 lg:px-10">
          <div className="text-[10px] uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-2">
            Scheduled to send ({scheduled.length})
          </div>
          <div className="space-y-2">
            {scheduled.map((s) => (
              <form
                key={s.id}
                action={cancelScheduledMessage}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[rgba(148,163,184,0.05)] border border-[rgba(148,163,184,0.2)]"
              >
                <input type="hidden" name="thread_id" value={thread.id} />
                <input type="hidden" name="scheduled_id" value={s.id} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{s.body}</div>
                  <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-warn)] font-bold mt-1">
                    Sends {new Date(s.scheduled_for).toLocaleString()}
                  </div>
                </div>
                <button type="submit" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)] shrink-0">
                  Cancel
                </button>
              </form>
            ))}
          </div>
        </section>
      ) : null}

      <details className="mt-4 mb-6 mx-4 sm:mx-6 lg:mx-10 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl">
        <summary className="cursor-pointer p-4 text-sm font-semibold">Schedule a message for later</summary>
        <form action={scheduleMessageAsCoach} className="p-4 pt-0 space-y-3">
          <input type="hidden" name="thread_id" value={thread.id} />
          <textarea
            name="body"
            rows={3}
            required
            placeholder="The message to send later (Monday morning motivation, Friday check-in reminder, etc.)"
            className="input resize-y"
          />
          <div className="flex items-center gap-3">
            <input
              type="datetime-local"
              name="scheduled_for"
              required
              className="input flex-1"
              min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
            />
            <button type="submit" className="btn btn-primary">Schedule</button>
          </div>
        </form>
      </details>
    </main>
  );
}
