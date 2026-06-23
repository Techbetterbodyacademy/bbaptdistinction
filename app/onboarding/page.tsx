import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createWorkspace } from "./actions";

export default async function OnboardingPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
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

  const { data: existing } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existing) {
    redirect("/app");
  }

  const suggestedName = (user.user_metadata?.pending_workspace_name as string | undefined) ?? "";
  const fullName = (user.user_metadata?.full_name as string | undefined) ?? "";

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-10 text-center">
          <div className="text-2xl font-extrabold tracking-tight">
            Better Body <span className="text-[var(--color-blue)]">Academy</span>
          </div>
          <p className="text-[var(--color-subtle)] mt-2 text-sm">
            One quick step to set up your workspace
          </p>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7">
          <h1 className="text-xl font-bold mb-1">Brand your workspace</h1>
          <p className="text-[var(--color-muted)] text-sm mb-6">
            You can change all of this later in settings.
          </p>

          <form action={createWorkspace} className="space-y-5">
            <div>
              <label className="label" htmlFor="name">Workspace name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={suggestedName}
                placeholder="Better Body Academy"
                className="input"
              />
            </div>

            <div>
              <label className="label" htmlFor="coach_name">Your coach name</label>
              <input
                id="coach_name"
                name="coach_name"
                type="text"
                required
                defaultValue={fullName}
                placeholder="Jase Stuart"
                className="input"
              />
            </div>

            <div>
              <label className="label" htmlFor="audience">Audience focus</label>
              <select
                id="audience"
                name="audience"
                className="input"
                defaultValue="men"
              >
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="both">Both</option>
              </select>
              <p className="text-[var(--color-subtle)] text-xs mt-2">
                Drives content targeting (programs, library, posts). Brand colors stay consistent — blue, black, white, gray.
              </p>
            </div>

            {params.error ? (
              <div className="text-sm text-[var(--color-danger)]">
                Could not create workspace. Try again.
              </div>
            ) : null}

            <button type="submit" className="btn btn-primary w-full">
              Open my workspace
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
