import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { verify2faCode, resend2faCode } from "../2fa-actions";

export default async function TwoFactorPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; resent?: string }>;
}) {
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pending = user.user_metadata?.pending_2fa === true;
  if (!pending) redirect("/");

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="text-2xl font-extrabold tracking-tight">
            Better Body <span className="text-[var(--color-blue)]">Academy</span>
          </div>
          <p className="text-[var(--color-subtle)] mt-2 text-sm">
            One more step
          </p>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7">
          <h1 className="text-xl font-bold mb-1">Enter your 6-digit code</h1>
          <p className="text-[var(--color-muted)] text-sm mb-6">
            We sent a code to <strong>{user.email}</strong>. Check your inbox (and spam folder). Expires in 10 minutes.
          </p>

          {sp.resent === "1" ? (
            <div className="mb-4 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-3 text-sm">
              A new code is on its way.
            </div>
          ) : null}

          <form action={verify2faCode} className="space-y-4">
            <div>
              <label className="label" htmlFor="code">6-digit code</label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                autoComplete="one-time-code"
                placeholder="123456"
                className="input text-2xl tracking-[0.5em] text-center font-mono"
                autoFocus
              />
            </div>

            {sp.error ? <TfaError error={sp.error} /> : null}

            <button type="submit" className="btn btn-primary w-full">
              Verify and sign in
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs">
            <form action={resend2faCode}>
              <button type="submit" className="text-[var(--color-muted)] hover:text-[var(--color-blue)]">
                Didn&apos;t get the code? Resend
              </button>
            </form>
            <form action="/auth/logout" method="post">
              <button type="submit" className="text-[var(--color-muted)] hover:text-[var(--color-danger)]">
                Cancel and sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

function TfaError({ error }: { error: string }) {
  const map: Record<string, { title: string; body: string }> = {
    missing: { title: "Enter the code", body: "Type the 6 digits we sent to your email." },
    invalid: { title: "Code is wrong or expired", body: "Codes expire after 10 minutes. Use Resend below for a new one." },
    attempts: { title: "Too many wrong attempts", body: "Sign out and try again." },
    resend: { title: "Could not send the code", body: "Email service rejected the request. Try the Resend button." },
    session: { title: "Could not complete sign-in", body: "Try Resend, or sign out and start over." }
  };
  const e = map[error] ?? map.session;
  return (
    <div className="rounded-xl p-4 text-sm space-y-1 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)]">
      <div className="font-bold text-[var(--color-danger)]">{e.title}</div>
      <div className="text-[var(--color-muted)]">{e.body}</div>
    </div>
  );
}
