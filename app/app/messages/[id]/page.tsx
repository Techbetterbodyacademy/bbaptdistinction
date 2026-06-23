import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendMessageAsCoach } from "./actions";
import { scheduleMessageAsCoach, cancelScheduledMessage } from "./schedule-actions";

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
      client:client_id(id, user_profile:user_id(full_name))
    `)
    .eq("id", threadId)
    .eq("workspace_id", workspace!.id)
    .maybeSingle();

  if (!thread) notFound();

  const [{ data: messages }, { data: scheduled }] = await Promise.all([
    supabase
      .from("message")
      .select("id, sender, body, created_at, sender_user_id")
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

  return (
    <main className="px-10 py-8 max-w-3xl flex flex-col" style={{ minHeight: "calc(100vh - 0px)" }}>
      <Link href="/app/messages" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Inbox
      </Link>

      <header className="flex items-center justify-between mt-4 mb-6 pb-4 border-b border-[var(--color-line)]">
        <div>
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-1">
            Conversation
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">{name}</h1>
        </div>
        <Link href={`/app/clients/${thread.client_id}`} className="btn btn-ghost text-sm">
          View profile
        </Link>
      </header>

      <div className="flex-1 space-y-3 mb-6 overflow-y-auto" style={{ minHeight: "300px" }}>
        {(!messages || messages.length === 0) ? (
          <div className="text-center py-12 text-sm text-[var(--color-muted)]">
            Start the conversation. Say hi, ask about their week, share a quick tip.
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === "coach" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  m.sender === "coach"
                    ? "bg-[var(--color-blue)] text-black"
                    : "bg-[var(--color-surface)] border border-[var(--color-line)]"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                <div className={`text-[10px] mt-1 ${m.sender === "coach" ? "text-black/60" : "text-[var(--color-subtle)]"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {scheduled && scheduled.length > 0 ? (
        <section className="mb-4">
          <div className="text-[10px] uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-2">
            Scheduled to send ({scheduled.length})
          </div>
          <div className="space-y-2">
            {scheduled.map((s) => (
              <form
                key={s.id}
                action={cancelScheduledMessage}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.2)]"
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

      <form action={sendMessageAsCoach} className="flex gap-2 sticky bottom-0 bg-[var(--color-bg)] pt-3 border-t border-[var(--color-line)]">
        <input type="hidden" name="thread_id" value={thread.id} />
        <textarea
          name="body"
          rows={1}
          required
          placeholder="Type a message…"
          className="input flex-1 resize-none"
          style={{ minHeight: "44px" }}
        />
        <button type="submit" className="btn btn-primary self-end">
          Send
        </button>
      </form>

      <details className="mt-4 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl">
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
