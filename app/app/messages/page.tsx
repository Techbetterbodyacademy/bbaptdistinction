import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function MessagesInboxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const { data: threads } = await supabase
    .from("message_thread")
    .select(`
      id, last_message_at, last_message_preview, coach_last_read_at, client_id,
      client:client_id(id, status, user_profile:user_id(full_name))
    `)
    .eq("workspace_id", workspace!.id)
    .order("last_message_at", { ascending: false });

  return (
    <main className="px-10 py-10 max-w-5xl">
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Inbox
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Messages</h1>
        <p className="text-[var(--color-muted)] mt-2">
          {threads?.length ?? 0} conversation{threads?.length === 1 ? "" : "s"}
        </p>
      </header>

      {(!threads || threads.length === 0) ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-12 text-center">
          <h2 className="text-lg font-bold mb-2">No conversations yet</h2>
          <p className="text-[var(--color-muted)] text-sm">
            Once you have clients, each one gets a private thread automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => {
            const client = Array.isArray(t.client) ? t.client[0] : t.client;
            const profile = client ? (Array.isArray(client.user_profile) ? client.user_profile[0] : client.user_profile) : null;
            const name = profile?.full_name ?? "Client";
            const initials = name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
            const unread = t.last_message_at && t.coach_last_read_at && new Date(t.last_message_at) > new Date(t.coach_last_read_at);

            return (
              <Link
                key={t.id}
                href={`/app/messages/${t.id}`}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                  unread
                    ? "border-[var(--color-blue)] bg-[rgba(0,174,239,0.04)]"
                    : "border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-blue)]"
                }`}
              >
                <div className="shrink-0 w-11 h-11 rounded-full bg-[rgba(0,174,239,0.15)] text-[var(--color-blue-glow)] font-extrabold text-sm flex items-center justify-center">
                  {initials || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className={`font-semibold truncate ${unread ? "text-[var(--color-blue-glow)]" : ""}`}>
                      {name}
                    </div>
                    <div className="text-xs text-[var(--color-muted)] shrink-0">
                      {t.last_message_at ? new Date(t.last_message_at).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <div className={`text-sm mt-0.5 truncate ${unread ? "text-[var(--color-ink)] font-semibold" : "text-[var(--color-muted)]"}`}>
                    {t.last_message_preview || "No messages yet"}
                  </div>
                </div>
                {unread ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-blue)] shrink-0" />
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
