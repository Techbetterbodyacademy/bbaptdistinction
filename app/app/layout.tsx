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
    .select("name, coach_name, primary_color, brand_audience")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!workspace) {
    redirect("/onboarding");
  }

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row"
      style={{
        // Workspace can override the primary blue via their own brand color
        ["--color-blue" as string]: workspace.primary_color ?? "#00AEEF"
      }}
    >
      <Sidebar workspaceName={workspace.name} coachName={workspace.coach_name} />
      <div className="flex-1 min-w-0">{children}</div>
      <IdleTimer />
    </div>
  );
}
