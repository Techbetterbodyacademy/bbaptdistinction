import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "./actions";
import { AvatarUploader } from "@/components/avatar-uploader";

export default async function AccountSettingsPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("user_profile")
    .select("full_name, avatar_url")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  // Detect how this account was created so we can phrase the form correctly.
  // If the user has a `providers` array including "email", they have a password.
  // If only Google is listed, they need to SET a password to enable email/password sign-in.
  const identities = user?.identities ?? [];
  const providers = identities.map((i) => i.provider);
  const hasPassword = providers.includes("email");
  const hasGoogle = providers.includes("google");

  return (
    <main className="px-10 py-10 max-w-2xl">
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Account
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Sign-in settings</h1>
        <p className="text-[var(--color-muted)] mt-2">
          Add or change the password you use to sign in.
        </p>
      </header>

      <div className="mb-8">
        <AvatarUploader
          currentUrl={profile?.avatar_url ?? null}
          name={profile?.full_name ?? "Coach"}
          role="coach"
          returnTo="/app/settings/account"
        />
      </div>

      <section className="mb-8">
        <h2 className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-3">
          Connected sign-in methods
        </h2>
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">Email &amp; password</div>
              <div className="text-xs text-[var(--color-muted)]">{user?.email}</div>
            </div>
            <span className={`text-[10px] uppercase tracking-[1.5px] font-bold ${hasPassword ? "text-[var(--color-blue-glow)]" : "text-[var(--color-subtle)]"}`}>
              {hasPassword ? "Set" : "Not set"}
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[var(--color-line)]">
            <div>
              <div className="font-semibold text-sm">Google</div>
              <div className="text-xs text-[var(--color-muted)]">Continue with Google on /login</div>
            </div>
            <span className={`text-[10px] uppercase tracking-[1.5px] font-bold ${hasGoogle ? "text-[var(--color-blue-glow)]" : "text-[var(--color-subtle)]"}`}>
              {hasGoogle ? "Linked" : "Not linked"}
            </span>
          </div>
        </div>
      </section>

      {sp.saved === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">
          Password saved. You can now sign in with your email and that password on the next visit.
        </div>
      ) : null}
      {sp.error ? <ErrorBox error={sp.error} /> : null}

      <form action={updatePassword} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 space-y-4">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)]">
          {hasPassword ? "Change password" : "Set a password"}
        </h2>
        {!hasPassword ? (
          <p className="text-sm text-[var(--color-muted)]">
            You signed up with Google, so you don&apos;t have a password yet. Set one now to also be able to sign in with your email.
          </p>
        ) : null}
        <div>
          <label className="label" htmlFor="password">New password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            placeholder="At least 8 characters"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirm new password</label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            placeholder="Type it again"
            className="input"
          />
        </div>
        <button type="submit" className="btn btn-primary">
          {hasPassword ? "Update password" : "Save password"}
        </button>
      </form>

      <div className="mt-8 text-center">
        <Link href="/app" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
          &larr; Back to dashboard
        </Link>
      </div>
    </main>
  );
}

function ErrorBox({ error }: { error: string }) {
  const messages: Record<string, string> = {
    "password required": "Enter a new password.",
    "password must be at least 8 characters": "Password must be at least 8 characters.",
    "password must be 72 characters or fewer": "Password is too long (max 72 characters).",
    "confirmation must match": "The two passwords don't match.",
    save: "Could not save. Try again."
  };
  const message = messages[error] ?? "Could not save. Try again.";
  return (
    <div className="mb-6 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm text-[var(--color-danger)]">
      {message}
    </div>
  );
}
