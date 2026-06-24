import Link from "next/link";
import { signInWithPassword } from "./actions";
import { signInWithGoogle } from "./google-action";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="text-2xl font-extrabold tracking-tight">
            Better Body <span className="text-[var(--color-blue)]">Academy</span>
          </div>
          <p className="text-[var(--color-subtle)] mt-2 text-sm">
            Coaching platform sign in
          </p>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7">
          <h1 className="text-xl font-bold mb-1">Sign in</h1>
          <p className="text-[var(--color-muted)] text-sm mb-6">
            Use Google for instant sign-in, or your email and password.
          </p>

          <form action={signInWithGoogle}>
            <button type="submit" className="btn btn-ghost w-full mb-4 flex items-center gap-3 justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
          </form>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[var(--color-line)]" />
            <span className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">or email</span>
            <div className="flex-1 h-px bg-[var(--color-line)]" />
          </div>

          <form action={signInWithPassword} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@bba.com"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
              />
            </div>

            {error ? <LoginError error={error} /> : null}

            <button type="submit" className="btn btn-primary w-full">
              Sign in
            </button>

            <div className="text-center pt-2">
              <Link href="/forgot-password" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-blue)]">
                Forgot your password?
              </Link>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--color-line)] text-center text-sm text-[var(--color-muted)]">
            New coach? <Link href="/signup" className="text-[var(--color-blue-glow)] font-semibold">Create a workspace</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function LoginError({ error }: { error: string }) {
  const map: Record<string, { title: string; body: React.ReactNode; tone: "warn" | "danger" }> = {
    missing: {
      tone: "danger",
      title: "Fill in every field",
      body: <span>Email and password are required.</span>
    },
    credentials: {
      tone: "danger",
      title: "Wrong email or password",
      body: <span>Double-check, or use Continue with Google.</span>
    },
    rate: {
      tone: "warn",
      title: "Too many requests",
      body: <span>Wait ~1 minute, then try again.</span>
    },
    nouser: {
      tone: "warn",
      title: "No account with that email",
      body: (
        <span>
          We don&apos;t recognize that email. <Link href="/signup" className="underline font-semibold">Create a workspace</Link> first.
        </span>
      )
    },
    session: {
      tone: "danger",
      title: "Could not start session",
      body: <span>Try again, or sign in with Google.</span>
    },
    callback: {
      tone: "danger",
      title: "Sign-in link expired or invalid",
      body: <span>Try Continue with Google instead.</span>
    },
    oauth: {
      tone: "danger",
      title: "Google sign-in failed",
      body: <span>The OAuth handshake failed. Check that Google is enabled in Supabase Auth providers.</span>
    },
    send: {
      tone: "danger",
      title: "Could not sign in",
      body: <span>Try again, or use Continue with Google.</span>
    }
  };

  const e = map[error] ?? map.send;
  const bg = e.tone === "danger" ? "rgba(239,68,68,0.08)" : "rgba(148,163,184,0.08)";
  const border = e.tone === "danger" ? "rgba(239,68,68,0.3)" : "rgba(148,163,184,0.3)";
  const titleColor = e.tone === "danger" ? "var(--color-danger)" : "var(--color-warn)";

  return (
    <div
      className="rounded-xl p-4 text-sm space-y-1"
      style={{ backgroundColor: bg, border: `1px solid ${border}` }}
    >
      <div className="font-bold" style={{ color: titleColor }}>{e.title}</div>
      <div className="text-[var(--color-muted)]">{e.body}</div>
    </div>
  );
}
