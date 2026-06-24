import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Item = {
  kind: "message" | "meal_plan" | "program" | "habit";
  title: string;
  context: string;
  href: string;
  occurredAt: string;
};

export const metadata = {
  title: "Notifications | BBA"
};

export default async function ClientNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("client_profile")
    .select("id, workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) redirect("/intake");

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [threadRes, mealPlansRes, programRes] = await Promise.all([
    supabase
      .from("message_thread")
      .select(`
        id, client_last_read_at,
        message:message!message_thread_id_fkey(id, body, created_at, sender)
      `)
      .eq("client_id", profile.id)
      .maybeSingle(),
    supabase
      .from("meal_plan")
      .select("id, created_at, status, intake_json")
      .eq("client_id", user.id)
      .eq("status", "ready")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    supabase
      .from("program_assignment")
      .select("id, program_id, assigned_at, program:program_id(name)")
      .eq("client_id", profile.id)
      .gte("assigned_at", since)
      .order("assigned_at", { ascending: false })
  ]);

  const items: Item[] = [];

  if (threadRes.data) {
    const t = threadRes.data as unknown as {
      id: string;
      client_last_read_at: string | null;
      message?: { id: string; body: string; created_at: string; sender: string }[];
    };
    const msgs = Array.isArray(t.message) ? t.message : [];
    const coachMsgs = msgs.filter((m) => m.sender === "coach");
    const cutoff = t.client_last_read_at ?? "1970-01-01T00:00:00Z";
    for (const m of coachMsgs) {
      if (m.created_at <= cutoff) continue;
      items.push({
        kind: "message",
        title: "New message from your coach",
        context: m.body.slice(0, 140),
        href: "/client/messages",
        occurredAt: m.created_at
      });
    }
  }

  if (mealPlansRes.data) {
    for (const mp of mealPlansRes.data) {
      const intake = mp.intake_json as { calories?: number; goal?: string };
      items.push({
        kind: "meal_plan",
        title: "Your coach generated a new meal plan",
        context: `${intake?.calories ?? "?"} kcal, goal: ${intake?.goal ?? "n/a"}`,
        href: `/client/meal-plan/${mp.id}`,
        occurredAt: mp.created_at
      });
    }
  }

  if (programRes.data) {
    for (const p of programRes.data as unknown as Array<{
      id: string;
      assigned_at: string;
      program?: { name?: string }[] | { name?: string };
    }>) {
      const programObj = Array.isArray(p.program) ? p.program[0] : p.program;
      const name = programObj?.name ?? "a new program";
      items.push({
        kind: "program",
        title: `${name} was assigned to you`,
        context: "Open Program to see your next workout.",
        href: "/client/program",
        occurredAt: p.assigned_at
      });
    }
  }

  items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  return (
    <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">
          Notifications
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mt-1">What's new for you</h1>
        <p className="text-sm text-[var(--color-muted)] mt-2">
          Messages from your coach, new meal plans, and program updates.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-8 text-center">
          <p className="text-[var(--color-muted)]">All caught up. Nothing new in the last 14 days.</p>
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
  meal_plan: "Meal plan",
  program: "Program",
  habit: "Habit"
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
