import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IdleTimer } from "@/components/idle-timer";

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
      <header className="border-b border-[var(--color-line)] bg-[var(--color-bg-deep)]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">
              {workspace?.name}
            </div>
            <div className="text-base font-extrabold">
              Hey, {profile.full_name?.split(" ")[0] ?? "there"}.
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/client"
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] px-3 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)]"
            >
              Home
            </Link>
            <Link
              href="/client/program"
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] px-3 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)]"
            >
              Program
            </Link>
            <Link
              href="/client/habits"
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] px-3 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)]"
            >
              Habits
            </Link>
            <Link
              href="/client/sessions"
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] px-3 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)]"
            >
              Sessions
            </Link>
            <Link
              href="/client/checkins"
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] px-3 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)]"
            >
              Check-ins
            </Link>
            <Link
              href="/client/logbook"
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] px-3 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)]"
            >
              Logbook
            </Link>
            <Link
              href="/client/library"
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] px-3 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)]"
            >
              Library
            </Link>
            <Link
              href="/client/messages"
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] px-3 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)]"
            >
              Messages
            </Link>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] px-3 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)]"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <IdleTimer />
    </div>
  );
}
