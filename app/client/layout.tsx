import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IdleTimer } from "@/components/idle-timer";
import { ClientNav } from "@/components/client-nav";

export default async function ClientLayout({
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
    .select("workspace_id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/intake");
  }

  if (profile.role !== "client") {
    redirect("/app");
  }

  const { data: workspace } = await supabase
    .from("workspace")
    .select("name, coach_name, primary_color")
    .eq("id", profile.workspace_id)
    .maybeSingle();

  // Notification counts for the client nav badges.
  const { data: clientProfile } = await supabase
    .from("client_profile")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let unreadMessageCount = 0;
  let newMealPlanCount = 0;
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  if (clientProfile?.id) {
    // Unread messages: coach messages newer than client_last_read_at
    const { data: thread } = await supabase
      .from("message_thread")
      .select("id, client_last_read_at")
      .eq("client_id", clientProfile.id)
      .maybeSingle();

    if (thread) {
      const cutoff = thread.client_last_read_at ?? "1970-01-01T00:00:00Z";
      const { count } = await supabase
        .from("message")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", thread.id)
        .eq("sender", "coach")
        .gt("created_at", cutoff);
      unreadMessageCount = count ?? 0;
    }
  }

  // New meal plans created for this user in the last 24h (heuristic, no last-seen tracking yet)
  const { count: mealCount } = await supabase
    .from("meal_plan")
    .select("id", { count: "exact", head: true })
    .eq("client_id", user.id)
    .eq("status", "ready")
    .gt("created_at", since24h);
  newMealPlanCount = mealCount ?? 0;

  const counts = {
    messages: unreadMessageCount,
    mealPlan: newMealPlanCount
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ ["--color-blue" as string]: workspace?.primary_color ?? "#00AEEF" }}
    >
      <ClientNav
        firstName={profile.full_name?.split(" ")[0] ?? "there"}
        workspaceName={workspace?.name ?? ""}
        counts={counts}
      />
      <div className="flex-1">{children}</div>
      <IdleTimer />
    </div>
  );
}
