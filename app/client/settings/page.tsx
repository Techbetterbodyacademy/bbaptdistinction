import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateClientAccount, updateClientPassword } from "./actions";
import { AvatarUploader } from "@/components/avatar-uploader";

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  name_required: "Name can't be empty.",
  name_update_failed: "Saving the name failed. Try again.",
  password_required: "Fill in both current and new password.",
  password_too_short: "New password must be at least 8 characters.",
  password_mismatch: "New password and confirmation don't match.",
  current_password_wrong: "Current password is incorrect.",
  password_update_failed: "Password update failed. Try again."
};

export const metadata = {
  title: "Settings | BBA"
};

export default async function ClientSettingsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profile")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const errorMessage = sp.error ? ERROR_MESSAGES[sp.error] ?? "Something went wrong." : null;
  const savedMessage = sp.saved === "name"
    ? "Name updated."
    : sp.saved === "password"
      ? "Password updated."
      : sp.saved === "avatar"
        ? "Profile picture updated."
        : sp.saved === "avatar_removed"
          ? "Profile picture removed."
          : null;

  return (
    <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-8">
      <header>
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">
          Settings
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mt-1">Your account</h1>
        <p className="text-sm text-[var(--color-muted)] mt-2">
          Update your profile and password.
        </p>
      </header>

      {savedMessage ? (
        <div className="bg-[rgba(0,174,239,0.08)] border border-[rgba(0,174,239,0.3)] rounded-xl p-4 text-sm text-[var(--color-blue-glow)] font-semibold">
          {savedMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="bg-[rgba(148,163,184,0.08)] border border-[rgba(148,163,184,0.3)] rounded-xl p-4 text-sm text-[var(--color-warn)]">
          {errorMessage}
        </div>
      ) : null}

      <AvatarUploader
        currentUrl={profile?.avatar_url ?? null}
        name={profile?.full_name ?? "You"}
        role="client"
        returnTo="/client/settings"
      />

      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
        <h2 className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-4">
          Profile
        </h2>
        <form action={updateClientAccount} className="space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Full name</span>
            <input
              type="text"
              name="full_name"
              defaultValue={profile?.full_name ?? ""}
              required
              className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Email</span>
            <input
              type="email"
              value={user.email ?? ""}
              disabled
              className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm opacity-60 cursor-not-allowed"
            />
            <span className="text-[10px] text-[var(--color-subtle)] mt-1 block">
              To change your email, message your coach.
            </span>
          </label>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary text-sm">
              Save name
            </button>
          </div>
        </form>
      </section>

      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
        <h2 className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-4">
          Change password
        </h2>
        <form action={updateClientPassword} className="space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Current password</span>
            <input
              type="password"
              name="current_password"
              required
              autoComplete="current-password"
              className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">New password</span>
            <input
              type="password"
              name="new_password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-[10px] text-[var(--color-subtle)] mt-1 block">
              At least 8 characters.
            </span>
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Confirm new password</span>
            <input
              type="password"
              name="confirm_password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary text-sm">
              Update password
            </button>
          </div>
        </form>
      </section>

      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
        <h2 className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-4">
          Sign out
        </h2>
        <p className="text-sm text-[var(--color-muted)] mb-4">
          End your session on this device.
        </p>
        <form action="/auth/logout" method="post">
          <button type="submit" className="btn btn-ghost text-sm">
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
