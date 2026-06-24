import Link from "next/link";
import { DOCS } from "./docs-config";

export const metadata = {
  title: "BBA Help & Docs",
  description: "Walkthroughs, getting-started guides, and project briefs for Better Body Academy."
};

export default function HelpIndexPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <header className="mb-12">
        <div className="text-[11px] uppercase tracking-[2px] text-[var(--color-blue-glow)] font-bold mb-3">
          Help and docs
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
          Everything you need to use{" "}
          <span style={{ fontFamily: "var(--font-serif)" }} className="italic text-[var(--color-blue-glow)]">
            Better Body Academy.
          </span>
        </h1>
        <p className="text-lg text-[var(--color-muted)]">
          Short guides for coaches, clients, and the team. Pick what's relevant to you.
        </p>
      </header>

      <ul className="space-y-4">
        {DOCS.map((doc) => (
          <li key={doc.slug}>
            <Link
              href={`/help/${doc.slug}`}
              className="block bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 hover:border-[var(--color-blue)] transition-all duration-300 hover:-translate-y-0.5 group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase tracking-[1.5px] font-bold px-2 py-0.5 rounded-full bg-[rgba(0,174,239,0.1)] text-[var(--color-blue-glow)] border border-[rgba(0,174,239,0.25)]">
                      {doc.audience}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold tracking-tight mb-2 group-hover:text-[var(--color-blue-glow)] transition-colors">
                    {doc.title}
                  </h2>
                  <p className="text-sm text-[var(--color-muted)] leading-relaxed">{doc.blurb}</p>
                </div>
                <span className="text-[var(--color-blue-glow)] text-2xl shrink-0">→</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
