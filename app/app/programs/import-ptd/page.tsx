import Link from "next/link";
import { importPtdProgram } from "./actions";

export default async function ImportPtdPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <main className="px-10 py-10 max-w-3xl">
      <Link href="/app/programs" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; All programs
      </Link>
      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          PT Distinction migration
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Import a PTD program</h1>
        <p className="text-[var(--color-muted)] mt-2">
          Paste the program text from PT Distinction below. The AI parses Phase / Week / Day structure and creates the program in your workspace.
        </p>
      </header>

      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-6">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">How to copy from PT Distinction</h2>
        <ol className="text-sm text-[var(--color-muted)] space-y-1 list-decimal pl-5">
          <li>Open the program in PT Distinction (e.g. <code className="text-xs bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded">/trpanel/library/program-template-list</code>)</li>
          <li>Click into a program to see its weeks / days / exercises</li>
          <li>Select all of the program structure (Ctrl/Cmd + A or click-drag)</li>
          <li>Copy (Ctrl/Cmd + C)</li>
          <li>Paste into the textarea below and click <strong>Import</strong></li>
        </ol>
      </div>

      {sp.error ? (
        <div className="mb-6 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm">
          {sp.error === "key"
            ? "OPENAI_API_KEY not set in Vercel."
            : sp.error === "ai"
              ? "AI request failed. Try again or shorten the input."
              : sp.error === "parse"
                ? "AI couldn't parse the program structure. Try cleaning the pasted text and retrying."
                : sp.error === "empty"
                  ? "Paste a program first."
                  : "Could not import. Try again."}
        </div>
      ) : null}

      <form action={importPtdProgram} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 space-y-4">
        <div>
          <label className="label" htmlFor="raw_text">Pasted PTD program text</label>
          <textarea
            id="raw_text"
            name="raw_text"
            required
            rows={20}
            placeholder={"2 - BEGINNER - GYM - 2 DAY - UPPER / LOWER\nWeek 1\nDay 1 (Upper)\nA1. Bench Press 3 x 8-10 @ RPE 7, 90s rest\nA2. Row 3 x 8-10\nB1. Overhead Press 3 x 10\n..."}
            className="input resize-y font-mono text-xs"
          />
          <p className="text-xs text-[var(--color-subtle)] mt-2">
            Tip: include the program name on the first line. Keep Phase/Week/Day headers as they appear.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Link href="/app/programs" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">Cancel</Link>
          <button type="submit" className="btn btn-primary">Import program</button>
        </div>
      </form>
    </main>
  );
}
