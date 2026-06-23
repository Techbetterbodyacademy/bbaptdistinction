import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sendMessageAsClient } from "./actions";

export default async function ClientMessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clientProfile } = await supabase
    .from("client_profile")
    .select("id, workspace_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!clientProfile) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-[var(--color-muted)]">Profile not found.</p>
      </main>
    );
  }

  const { data: workspace } = await supabase
    .from("workspace")
    .select("coach_name")
    .eq("id", clientProfile.workspace_id)
    .maybeSingle();

  const { data: thread } = await supabase
    .from("message_thread")
    .select("id")
    .eq("client_id", clientProfile.id)
    .maybeSingle();

  if (!thread) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/client" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
          &larr; Home
        </Link>
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-8 mt-6">
          <p className="text-[var(--color-muted)]">Conversation not set up yet. Refresh in a moment.</p>
        </div>
      </main>
    );
  }

  const { data: messages } = await supabase
    .from("message")
    .select("id, sender, body, created_at")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true });

  // Mark thread as read from client side
  await supabase
    .from("message_thread")
    .update({ client_last_read_at: new Date().toISOString() })
    .eq("id", thread.id);

  return (
    <main className="max-w-3xl mx-auto px-6 py-8 flex flex-col" style={{ minHeight: "calc(100vh - 80px)" }}>
      <Link href="/client" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Home
      </Link>

      <header className="mt-4 mb-6 pb-4 border-b border-[var(--color-line)]">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-1">
          Direct message
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">
          {workspace?.coach_name ?? "Your coach"}
        </h1>
      </header>

      <div className="flex-1 space-y-3 mb-6 overflow-y-auto" style={{ minHeight: "300px" }}>
        {(!messages || messages.length === 0) ? (
          <div className="text-center py-12 text-sm text-[var(--color-muted)]">
            Say hi to your coach. Questions, wins, struggles — it all lives here.
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === "client" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  m.sender === "client"
                    ? "bg-[var(--color-blue)] text-black"
                    : "bg-[var(--color-surface)] border border-[var(--color-line)]"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                <div className={`text-[10px] mt-1 ${m.sender === "client" ? "text-black/60" : "text-[var(--color-subtle)]"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <form action={sendMessageAsClient} className="flex gap-2 sticky bottom-0 bg-[var(--color-bg)] pt-3 border-t border-[var(--color-line)]">
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
    </main>
  );
}
