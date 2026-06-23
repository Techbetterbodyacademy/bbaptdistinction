export default function SetupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-10 text-center">
          <div className="text-2xl font-extrabold tracking-tight">
            Better Body <span className="text-[var(--color-blue)]">Academy</span>
          </div>
          <p className="text-[var(--color-subtle)] mt-2 text-sm">
            Coaching platform
          </p>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-8">
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-warn)] font-bold mb-3">
            Setup required
          </div>
          <h1 className="text-2xl font-bold mb-2">Supabase isn&rsquo;t connected yet.</h1>
          <p className="text-[var(--color-muted)] text-sm mb-6">
            The app is deployed, but it can&rsquo;t talk to a database until you finish the three steps below.
          </p>

          <ol className="space-y-5">
            <Step
              num="1"
              title="Create a Supabase project"
              body="Sign in at supabase.com/dashboard. Create a new project and grab the Project URL and anon public key from Settings → API."
            />
            <Step
              num="2"
              title="Run the four schema SQL files in order"
              body="In the Supabase SQL editor, run supabase-schema.sql, then the three phase patches (1, 2, 3). All four live in the repo at clients/betterbodyacademy/coaching-app/."
            />
            <Step
              num="3"
              title="Add the env vars in Vercel and redeploy"
              body="Go to Project Settings → Environment Variables and add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SITE_URL. Then redeploy."
            />
          </ol>

          <div className="mt-8 pt-6 border-t border-[var(--color-line)] text-sm text-[var(--color-muted)]">
            Once those three are done, this page goes away and the login flow takes over.
          </div>
        </div>
      </div>
    </main>
  );
}

function Step({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <li className="flex gap-4">
      <div className="shrink-0 w-9 h-9 rounded-full bg-[rgba(0,174,239,0.15)] text-[var(--color-blue-glow)] font-extrabold flex items-center justify-center text-sm">
        {num}
      </div>
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-[var(--color-muted)] mt-1">{body}</div>
      </div>
    </li>
  );
}
