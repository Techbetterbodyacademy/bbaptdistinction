import { askAssistant } from "./actions";

export default async function AssistantPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; a?: string; error?: string }>;
}) {
  const sp = await searchParams;

  const suggestions = [
    "Which clients haven't checked in this week?",
    "What's the top reason clients pause?",
    "Suggest a Monday motivation message.",
    "Which program is most popular right now?",
    "How is my coaching business going overall?"
  ];

  return (
    <main className="px-10 py-10 max-w-3xl">
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          AI Assistant
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Ask about your coaching business</h1>
        <p className="text-[var(--color-muted)] mt-2">
          GPT sees your workspace snapshot (clients, programs, activity). Ask anything.
        </p>
      </header>

      <form action={askAssistant} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-6 space-y-4">
        <div>
          <label className="label" htmlFor="question">Your question</label>
          <textarea
            id="question"
            name="question"
            rows={3}
            required
            placeholder="Which clients need a check-in nudge today?"
            defaultValue={sp.q ?? ""}
            className="input resize-y"
          />
        </div>
        <button type="submit" className="btn btn-primary">Ask</button>
      </form>

      {sp.error ? (
        <div className="mb-6 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm">
          {sp.error === "key" ? "OPENAI_API_KEY not set." : sp.error === "ai" ? "AI request failed. Try again." : sp.error}
        </div>
      ) : null}

      {sp.a ? (
        <section className="mb-8">
          <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">Answer</div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 whitespace-pre-wrap">
            {sp.a}
          </div>
        </section>
      ) : null}

      <section>
        <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-3">Try one of these</div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <form key={s} action={askAssistant}>
              <input type="hidden" name="question" value={s} />
              <button type="submit" className="btn btn-ghost text-xs">{s}</button>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}
