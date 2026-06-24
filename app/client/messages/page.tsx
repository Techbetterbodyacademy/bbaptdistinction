import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sendMessageAsClient } from "./actions";
import { MessageThread } from "@/components/messages/message-thread";
import { Avatar } from "@/components/avatar";

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
    .select("coach_name, owner_id")
    .eq("id", clientProfile.workspace_id)
    .maybeSingle();

  const { data: coachProfile } = workspace?.owner_id
    ? await supabase
        .from("user_profile")
        .select("avatar_url, full_name")
        .eq("id", workspace.owner_id)
        .maybeSingle()
    : { data: null };

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
    .select("id, sender, body, created_at, reply_to_id")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true });

  // Mark thread as read from client side
  await supabase
    .from("message_thread")
    .update({ client_last_read_at: new Date().toISOString() })
    .eq("id", thread.id);

  const initialMessages = (messages ?? []).map((m) => ({
    id: m.id,
    sender: (m.sender === "client" ? "client" : "coach") as "client" | "coach",
    body: m.body,
    created_at: m.created_at,
    reply_to_id: m.reply_to_id ?? null
  }));

  return (
    <main className="w-full flex flex-col" style={{ minHeight: "calc(100vh - 80px)" }}>
      <div className="px-4 sm:px-6 lg:px-10 py-6">
        <Link href="/client" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
          &larr; Home
        </Link>

        <header className="mt-4 mb-2 pb-4 border-b border-[var(--color-line)] flex items-center gap-3">
          <Avatar
            url={coachProfile?.avatar_url}
            name={coachProfile?.full_name ?? workspace?.coach_name ?? "Coach"}
            size="lg"
          />
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-1">
              Direct message
            </div>
            <h1 className="text-xl font-extrabold tracking-tight truncate">
              {workspace?.coach_name ?? "Your coach"}
            </h1>
          </div>
        </header>
      </div>

      <MessageThread
        threadId={thread.id}
        initialMessages={initialMessages}
        mySide="client"
        sendAction={sendMessageAsClient}
        emptyHint="Say hi to your coach. Questions, wins, struggles, all lives here."
      />
    </main>
  );
}
