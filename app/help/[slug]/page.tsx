import Link from "next/link";
import { notFound } from "next/navigation";
import fs from "node:fs/promises";
import path from "node:path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DOCS, getDocBySlug } from "../docs-config";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) return { title: "Not found" };
  return {
    title: `${doc.title} — BBA Help`,
    description: doc.blurb
  };
}

async function readDoc(file: string): Promise<string> {
  const filePath = path.join(process.cwd(), "docs", file);
  return fs.readFile(filePath, "utf-8");
}

export default async function HelpDocPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) notFound();

  const markdown = await readDoc(doc.file);

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <Link href="/help" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue-glow)] inline-flex items-center gap-1 mb-8">
        <span>&larr;</span> All docs
      </Link>

      <header className="mb-10 pb-8 border-b border-[var(--color-line)]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-[1.5px] font-bold px-2 py-0.5 rounded-full bg-[rgba(0,174,239,0.1)] text-[var(--color-blue-glow)] border border-[rgba(0,174,239,0.25)]">
            {doc.audience}
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">{doc.title}</h1>
        <p className="text-base text-[var(--color-muted)] mt-3">{doc.blurb}</p>
      </header>

      <article className="prose-bba">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-12 mb-4 first:mt-0">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-10 mb-4 pt-6 border-t border-[var(--color-line)] first:border-t-0 first:pt-0 first:mt-8">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xl font-extrabold tracking-tight mt-8 mb-3">{children}</h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-base font-extrabold tracking-tight mt-6 mb-2 text-[var(--color-blue-glow)] uppercase tracking-[1.5px] text-xs">{children}</h4>
            ),
            p: ({ children }) => (
              <p className="text-base leading-relaxed text-[var(--color-ink)] mb-4">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="space-y-2 mb-5 pl-6 list-disc marker:text-[var(--color-blue-glow)]">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="space-y-2 mb-5 pl-6 list-decimal marker:text-[var(--color-blue-glow)] marker:font-bold">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="text-base leading-relaxed text-[var(--color-ink)]">{children}</li>
            ),
            a: ({ children, href }) => (
              <a
                href={href}
                target={href?.startsWith("http") ? "_blank" : undefined}
                rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                className="text-[var(--color-blue-glow)] underline decoration-[rgba(56,197,255,0.4)] underline-offset-4 hover:decoration-[var(--color-blue-glow)] transition-colors"
              >
                {children}
              </a>
            ),
            strong: ({ children }) => (
              <strong className="font-extrabold text-[var(--color-ink)]">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="italic" style={{ fontFamily: "var(--font-serif)" }}>{children}</em>
            ),
            code: ({ children, className }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code className="font-mono text-sm px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-line)] text-[var(--color-blue-glow)]">
                    {children}
                  </code>
                );
              }
              return <code className={className}>{children}</code>;
            },
            pre: ({ children }) => (
              <pre className="font-mono text-sm bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5 overflow-x-auto my-5">{children}</pre>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-[var(--color-blue-glow)] pl-5 py-2 my-6 bg-[rgba(0,174,239,0.04)] rounded-r-lg italic text-[var(--color-muted)]">
                {children}
              </blockquote>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-6 rounded-xl border border-[var(--color-line)]">
                <table className="w-full">{children}</table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-[var(--color-surface)] border-b border-[var(--color-line)]">{children}</thead>
            ),
            th: ({ children }) => (
              <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)]">{children}</th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-3 text-sm border-t border-[var(--color-line)]">{children}</td>
            ),
            hr: () => <hr className="my-10 border-t border-[var(--color-line)]" />,
            input: ({ checked, ...rest }) => (
              <input
                type="checkbox"
                checked={checked ?? false}
                readOnly
                className="mr-2 accent-[var(--color-blue-glow)]"
                {...rest}
              />
            )
          }}
        >
          {markdown}
        </ReactMarkdown>
      </article>

      <nav className="mt-16 pt-8 border-t border-[var(--color-line)] flex items-center justify-between gap-4 flex-wrap">
        <Link href="/help" className="btn btn-ghost text-sm">
          &larr; All docs
        </Link>
        <Link href="https://bbapt.vercel.app" className="btn btn-primary text-sm">
          Open the app
        </Link>
      </nav>
    </main>
  );
}
