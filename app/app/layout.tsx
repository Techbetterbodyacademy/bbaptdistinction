import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { IdleTimer } from "@/components/idle-timer";

export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profile")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "client") {
    redirect("/client");
  }

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id, name, coach_name, primary_color, brand_audience")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!workspace) {
    redirect("/onboarding");
  }

  const { data: coachProfile } = await supabase
    .from("user_profile")
    .select("avatar_url, full_name")
    .eq("id", user.id)
    .maybeSingle();

  // Fetch notification counts for sidebar badges (unread messages, new check-ins, pending invites).
  // All scoped to this workspace via RLS + explicit filter.
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [pendingInvitesRes, recentCheckinsRes, unreadThreadsRes] = await Promise.all([
    supabase
      .from("client_invite")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("status", "pending"),
    supabase
      .from("check_in")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .gte("created_at", since7d),
    supabase
      .from("message_thread")
      .select("id, coach_last_read_at, message:message!message_thread_id_fkey(created_at, sender)")
      .eq("workspace_id", workspace.id)
  ]);

  // Count threads where the last client message is newer than coach_last_read_at.
  let unreadThreads = 0;
  if (unreadThreadsRes.data) {
    for (const t of unreadThreadsRes.data as unknown as Array<{ coach_last_read_at: string | null; message?: { created_at: string; sender: string }[] }>) {
      const msgs = Array.isArray(t.message) ? t.message : [];
      const lastClientMsg = msgs.filter((m) => m.sender === "client").sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      if (lastClientMsg && (!t.coach_last_read_at || lastClientMsg.created_at > t.coach_last_read_at)) {
        unreadThreads += 1;
      }
    }
  }

  const counts = {
    messages: unreadThreads,
    checkins: recentCheckinsRes.count ?? 0,
    clients: pendingInvitesRes.count ?? 0,
    notifications: unreadThreads + (recentCheckinsRes.count ?? 0) + (pendingInvitesRes.count ?? 0)
  };

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row"
      style={{
        // Workspace can override the primary blue via their own brand color
        ["--color-blue" as string]: workspace.primary_color ?? "#00AEEF"
      }}
    >
      <Sidebar
        workspaceName={workspace.name}
        coachName={workspace.coach_name}
        coachAvatarUrl={coachProfile?.avatar_url ?? null}
        counts={counts}
      />
      <div className="flex-1 min-w-0">{children}</div>
      <IdleTimer />
    </div>
  );
}
