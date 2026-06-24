import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Item = {
  kind: "message" | "checkin" | "invite" | "meal_plan" | "session";
  title: string;
  context: string;
  href: string;
  occurredAt: string;
};

export const metadata = {
  title: "Notifications | BBA"
};

export default async function CoachNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!workspace) redirect("/onboarding");

  // Pull a window of relevant events from the last 14 days
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [threadsRes, checkinsRes, invitesRes, mealPlansRes, sessionsRes] = await Promise.all([
    supabase
      .from("message_thread")
      .select(`
        id, client_id, coach_last_read_at,
        client:client_id(id, user_profile:user_id(full_name)),
        message:message!message_thread_id_fkey(id, body, created_at, sender)
      `)
      .eq("workspace_id", workspace.id),
    supabase
      .from("check_in")
      .select(`
        id, client_id, created_at, weight_kg, energy, adherence,
        client:client_id(user_profile:user_id(full_name))
      `)
      .eq("workspace_id", workspace.id)
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_invite")
      .select("id, full_name, email, created_at, status")
      .eq("workspace_id", workspace.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("meal_plan")
      .select(`
        id, client_id, created_at, status, intake_json,
        client:client_id(full_name)
      `)
      .eq("workspace_id", workspace.id)
      .eq("status", "ready")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    supabase
      .from("workout_session")
      .select(`
        id, client_id, performed_at, overall_rpe, duration_minutes,
        client:client_id(user_profile:user_id(full_name))
      `)
      .eq("workspace_id", workspace.id)
      .gte("performed_at", since)
      .order("performed_at", { ascending: false })
      .limit(20)
  ]);

  const items: Item[] = [];

  // Unread messages: any thread where last client message > coach_last_read_at
  if (threadsRes.data) {
    for (const t of threadsRes.data as unknown as Array<{
      id: string;
      client_id: string;
      coach_last_read_at: string | null;
      client?: { user_profile?: { full_name?: string }[] | { full_name?: string } }[] | { user_profile?: { full_name?: string }[] | { full_name?: string } };
      message?: { id: string; body: string; created_at: string; sender: string }[];
    }>) {
      const msgs = Array.isArray(t.message) ? t.message : [];
      const lastClientMsg = msgs
        .filter((m) => m.sender === "client")
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      if (!lastClientMsg) continue;
      if (t.coach_last_read_at && lastClientMsg.created_at <= t.coach_last_read_at) continue;
      const clientObj = Array.isArray(t.client) ? t.client[0] : t.client;
      const profile = clientObj ? (Array.isArray(clientObj.user_profile) ? clientObj.user_profile[0] : clientObj.user_profile) : null;
      const name = profile?.full_name ?? "A client";
      items.push({
        kind: "message",
        title: `New message from ${name}`,
        context: lastClientMsg.body.slice(0, 140),
        href: `/app/messages/${t.id}`,
        occurredAt: lastClientMsg.created_at
      });
    }
  }

  // Check-ins
  if (checkinsRes.data) {
    for (const c of checkinsRes.data as unknown as Array<{
      id: string;
      created_at: string;
      weight_kg: number | null;
      energy: number | null;
      adherence: number | null;
      client_id: string;
      client?: { user_profile?: { full_name?: string }[] | { full_name?: string } }[] | { user_profile?: { full_name?: string }[] | { full_name?: string } };
    }>) {
      const clientObj = Array.isArray(c.client) ? c.client[0] : c.client;
      const profile = clientObj ? (Array.isArray(clientObj.user_profile) ? clientObj.user_profile[0] : clientObj.user_profile) : null;
      const name = profile?.full_name ?? "A client";
      const ctxParts: string[] = [];
      if (c.weight_kg != null) ctxParts.push(`${c.weight_kg}kg`);
      if (c.energy != null) ctxParts.push(`energy ${c.energy}/10`);
      if (c.adherence != null) ctxParts.push(`adherence ${c.adherence}/10`);
      items.push({
        kind: "checkin",
        title: `${name} submitted a check-in`,
        context: ctxParts.join(" . ") || "Photos and notes attached.",
        href: `/app/checkins/${c.id}`,
        occurredAt: c.created_at
      });
    }
  }

  // Pending invites (lead awaits action)
  if (invitesRes.data) {
    for (const inv of invitesRes.data) {
      items.push({
        kind: "invite",
        title: `Pending invite for ${inv.full_name || inv.email}`,
        context: `${inv.email} has not joined yet. Share the link or cancel.`,
        href: `/app/clients/invite/${inv.id}`,
        occurredAt: inv.created_at
      });
    }
  }

  // Meal plans generated
  if (mealPlansRes.data) {
    for (const mp of mealPlansRes.data as unknown as Array<{
      id: string;
      client_id: string;
      created_at: string;
      intake_json: { calories?: number; goal?: string };
      client?: { full_name?: string }[] | { full_name?: string };
    }>) {
      const clientObj = Array.isArray(mp.client) ? mp.client[0] : mp.client;
      const name = clientObj?.full_name ?? "Client";
      items.push({
        kind: "meal_plan",
        title: `Meal plan generated for ${name}`,
        context: `${mp.intake_json?.calories ?? "?"} kcal, goal: ${mp.intake_json?.goal ?? "n/a"}`,
        href: `/app/clients/${mp.client_id}`,
        occurredAt: mp.created_at
      });
    }
  }

  // Logged sessions
  if (sessionsRes.data) {
    for (const s of sessionsRes.data as unknown as Array<{
      id: string;
      client_id: string;
      performed_at: string;
      duration_minutes: number | null;
      overall_rpe: number | null;
      client?: { user_profile?: { full_name?: string }[] | { full_name?: string } }[] | { user_profile?: { full_name?: string }[] | { full_name?: string } };
    }>) {
      const clientObj = Array.isArray(s.client) ? s.client[0] : s.client;
      const profile = clientObj ? (Array.isArray(clientObj.user_profile) ? clientObj.user_profile[0] : clientObj.user_profile) : null;
      const name = profile?.full_name ?? "A client";
      const ctxParts: string[] = [];
      if (s.duration_minutes) ctxParts.push(`${s.duration_minutes} min`);
      if (s.overall_rpe != null) ctxParts.push(`RPE ${s.overall_rpe}/10`);
      items.push({
        kind: "session",
        title: `${name} logged a workout`,
        context: ctxParts.join(" . ") || "Session details available.",
        href: `/app/clients/${s.client_id}`,
        occurredAt: s.performed_at
      });
    }
  }

  items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  return (
    <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">
          Notifications
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mt-1">What's new</h1>
        <p className="text-sm text-[var(--color-muted)] mt-2">
          Recent activity across your workspace. Click any item to jump straight in.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-8 text-center">
          <p className="text-[var(--color-muted)]">All caught up. No new activity in the last 14 days.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((it, idx) => (
            <li key={`${it.kind}-${idx}-${it.occurredAt}`}>
              <NotificationRow item={it} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function NotificationRow({ item }: { item: Item }) {
  const ago = relativeTime(item.occurredAt);
  const kindLabel = KIND_LABEL[item.kind];

  return (
    <Link
      href={item.href}
      className="block bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-4 hover:border-[var(--color-blue)] transition-colors group"
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-blue-glow)] mt-2.5" style={{ boxShadow: "0 0 8px rgba(56,197,255,0.6)" }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] uppercase tracking-[1.5px] font-bold text-[var(--color-blue-glow)]">
              {kindLabel}
            </span>
            <span className="text-[10px] text-[var(--color-subtle)]">{ago}</span>
          </div>
          <div className="font-bold text-[var(--color-ink)]">{item.title}</div>
          <div className="text-sm text-[var(--color-muted)] mt-1 truncate">{item.context}</div>
        </div>
        <span className="text-[var(--color-blue-glow)] text-xl shrink-0 group-hover:translate-x-1 transition-transform">→</span>
      </div>
    </Link>
  );
}

const KIND_LABEL: Record<Item["kind"], string> = {
  message: "Message",
  checkin: "Check-in",
  invite: "Invite",
  meal_plan: "Meal plan",
  session: "Session"
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
