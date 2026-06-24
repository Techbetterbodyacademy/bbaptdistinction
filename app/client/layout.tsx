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

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ ["--color-blue" as string]: workspace?.primary_color ?? "#00AEEF" }}
    >
      <ClientNav
        firstName={profile.full_name?.split(" ")[0] ?? "there"}
        workspaceName={workspace?.name ?? ""}
      />
      <div className="flex-1">{children}</div>
      <IdleTimer />
    </div>
  );
}
