import Link from "next/link";
import { importClientsCsv } from "./actions";

const SAMPLE_CSV = `full_name,email,age,height_cm,current_weight_kg,lifecycle_stage
Mark Thompson,mark@example.com,47,178,92,momentum
Alice Smith,alice@example.com,42,170,75,kickoff
James Carter,james@example.com,55,180,90,onboarding`;

export default async function ImportClientsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; ok?: string; created?: string; skipped?: string }>;
}) {
  const sp = await searchParams;

  return (
    <main className="px-10 py-10 max-w-3xl">
      <Link href="/app/clients" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Back to clients
      </Link>
      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Bulk import
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Import clients from CSV</h1>
        <p className="text-[var(--color-muted)] mt-2">
          Paste rows from your spreadsheet. Each row becomes a client_profile in your workspace with the lifecycle stage you specify. No invite emails are sent.
        </p>
      </header>

      {sp.ok === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">
          Imported {sp.created ?? "0"} clients. Skipped {sp.skipped ?? "0"} duplicates.
        </div>
      ) : null}
      {sp.error ? (
        <div className="mb-6 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm">
          {decodeURIComponent(sp.error)}
        </div>
      ) : null}

      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-6">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">CSV format</h2>
        <p className="text-sm text-[var(--color-muted)] mb-3">
          First row must be the header. Required columns: <code className="text-xs bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded">full_name</code>, <code className="text-xs bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded">email</code>.
          Optional: <code className="text-xs bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded">age</code>, <code className="text-xs bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded">height_cm</code>, <code className="text-xs bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded">current_weight_kg</code>, <code className="text-xs bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded">lifecycle_stage</code>.
        </p>
        <p className="text-sm text-[var(--color-muted)] mb-3">
          Valid <code className="text-xs bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded">lifecycle_stage</code> values: <code className="text-xs">onboarding</code>, <code className="text-xs">kickoff</code>, <code className="text-xs">momentum</code>, <code className="text-xs">celebration</code>, <code className="text-xs">challenge_upgrade</code>, <code className="text-xs">catchup_call</code>, <code className="text-xs">retreat</code>, <code className="text-xs">renewed</code>, <code className="text-xs">offboarded</code>.
        </p>
        <details>
          <summary className="text-xs text-[var(--color-blue-glow)] cursor-pointer">Sample CSV</summary>
          <pre className="text-xs bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg p-3 mt-2 overflow-x-auto whitespace-pre">{SAMPLE_CSV}</pre>
        </details>
      </div>

      <form action={importClientsCsv} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 space-y-4">
        <div>
          <label className="label" htmlFor="csv">Paste your CSV</label>
          <textarea
            id="csv"
            name="csv"
            required
            rows={16}
            placeholder={SAMPLE_CSV}
            className="input resize-y font-mono text-xs"
          />
          <p className="text-xs text-[var(--color-subtle)] mt-2">
            Duplicates (same email) are skipped automatically. Each new client gets a placeholder auth user — they can claim their account later via password reset.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Link href="/app/clients" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">Cancel</Link>
          <button type="submit" className="btn btn-primary">Import clients</button>
        </div>
      </form>
    </main>
  );
}
