import Link from "next/link";
import { requestPasswordReset, resetPassword, resendResetCode } from "./actions";

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ sent?: string; email?: string; error?: string; resent?: string }>;
}) {
  const params = await searchParams;
  const sent = params.sent === "1";
  const email = params.email ?? "";
  const error = params.error;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="text-2xl font-extrabold tracking-tight">
            Better Body <span className="text-[var(--color-blue)]">Academy</span>
          </div>
          <p className="text-[var(--color-subtle)] mt-2 text-sm">
            Reset your password
          </p>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7">
          {!sent ? (
            <>
              <h1 className="text-xl font-bold mb-1">Forgot your password?</h1>
              <p className="text-[var(--color-muted)] text-sm mb-6">
                Enter the email on your account and we&apos;ll send a 6-digit code. Use it on the next screen to choose a new password.
              </p>

              <form action={requestPasswordReset} className="space-y-4">
                <div>
                  <label className="label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    defaultValue={email}
                    placeholder="you@bba.com"
                    className="input"
                  />
                </div>

                {error ? <ForgotError error={error} /> : null}

                <button type="submit" className="btn btn-primary w-full">
                  Send reset code
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold mb-1">Pick a new password</h1>
              <p className="text-[var(--color-muted)] text-sm mb-6">
                We sent a 6-digit code to <strong>{email}</strong>. Enter it below and choose a new password.
              </p>

              {params.resent === "1" ? (
                <div className="mb-4 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-3 text-sm">
                  A new code is on its way.
                </div>
              ) : null}

              <form action={resetPassword} className="space-y-4">
                <input type="hidden" name="email" value={email} />
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
                  />
                </div>
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

                {error ? <ForgotError error={error} /> : null}

                <button type="submit" className="btn btn-primary w-full">
                  Save new password and sign in
                </button>
              </form>

              <div className="mt-4 text-center">
                <form action={resendResetCode}>
                  <input type="hidden" name="email" value={email} />
                  <button type="submit" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-blue)]">
                    Didn&apos;t get the code? Resend
                  </button>
                </form>
              </div>
            </>
          )}

          <div className="mt-6 pt-6 border-t border-[var(--color-line)] text-center text-sm text-[var(--color-muted)]">
            Remembered it? <Link href="/login" className="text-[var(--color-blue-glow)] font-semibold">Back to sign in</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function ForgotError({ error }: { error: string }) {
  const map: Record<string, { title: string; body: React.ReactNode; tone: "warn" | "danger" }> = {
    missing: { tone: "danger", title: "Fill in every field", body: <span>Email and code are required.</span> },
    nouser: {
      tone: "warn",
      title: "No account with that email",
      body: (
        <span>
          We don&apos;t recognize that email. <Link href="/signup" className="underline font-semibold">Create a workspace</Link> first.
        </span>
      )
    },
    invalid: { tone: "danger", title: "Code is wrong or expired", body: <span>Codes expire after 10 minutes. Use Resend below.</span> },
    attempts: { tone: "danger", title: "Too many wrong attempts", body: <span>Request a fresh code.</span> },
    resend: { tone: "danger", title: "Could not send the code", body: <span>Email service rejected the request. Try the Resend button.</span> },
    send: { tone: "danger", title: "Something went wrong", body: <span>Try again in a moment.</span> },
    save: { tone: "danger", title: "Could not save your password", body: <span>The code was correct but we couldn&apos;t update your account. Try again.</span> },
    "password required": { tone: "danger", title: "Pick a password", body: <span>Type a new password.</span> },
    "password must be at least 8 characters": { tone: "danger", title: "Password too short", body: <span>Use at least 8 characters.</span> },
    "password must be 72 characters or fewer": { tone: "danger", title: "Password too long", body: <span>Max 72 characters.</span> },
    "confirmation must match": { tone: "danger", title: "Passwords don&apos;t match", body: <span>Re-type your new password in both fields.</span> }
  };

  const e = map[error] ?? map.send;
  const bg = e.tone === "danger" ? "rgba(239,68,68,0.08)" : "rgba(148,163,184,0.08)";
  const border = e.tone === "danger" ? "rgba(239,68,68,0.3)" : "rgba(148,163,184,0.3)";
  const titleColor = e.tone === "danger" ? "var(--color-danger)" : "var(--color-warn)";

  return (
    <div className="rounded-xl p-4 text-sm space-y-1" style={{ backgroundColor: bg, border: `1px solid ${border}` }}>
      <div className="font-bold" style={{ color: titleColor }}>{e.title}</div>
      <div className="text-[var(--color-muted)]">{e.body}</div>
    </div>
  );
}
