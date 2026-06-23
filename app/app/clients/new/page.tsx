import Link from "next/link";
import { inviteClient } from "./actions";

export default async function NewClientPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="px-10 py-10 max-w-2xl">
      <header className="mb-8">
        <Link href="/app/clients" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
          &larr; Back to clients
        </Link>
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2 mt-4">
          New client
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Invite a client</h1>
        <p className="text-[var(--color-muted)] mt-2">
          We&rsquo;ll email them a magic link to open the intake form. No password to remember.
        </p>
      </header>

      <form action={inviteClient} className="space-y-5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7">
        <div>
          <label className="label" htmlFor="full_name">Client name</label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            placeholder="James Carter"
            className="input"
          />
        </div>

        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="off"
            placeholder="james@example.com"
            className="input"
          />
          <p className="text-[var(--color-subtle)] text-xs mt-2">
            The magic link goes to this address.
          </p>
        </div>

        {params.error ? (
          <div className="text-sm text-[var(--color-danger)]">
            {params.error === "duplicate"
              ? "An invite or client already exists for that email."
              : params.error === "rate"
                ? "Supabase blocks repeated sends to the same email for 60 seconds. Wait a minute and try again."
                : "Could not send invite. Try again."}
          </div>
        ) : null}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="btn btn-primary">
            Send invite
          </button>
          <Link href="/app/clients" className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
