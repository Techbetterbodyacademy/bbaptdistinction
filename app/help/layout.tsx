import Link from "next/link";

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="top" className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <header className="sticky top-0 z-40 bg-[rgba(0,0,0,0.6)] backdrop-blur border-b border-[var(--color-line)]">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/help" className="flex items-center gap-2.5 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/bba-badge.png"
              alt="BBA"
              className="w-8 h-8 rounded-full transition-transform duration-300 group-hover:scale-110"
              style={{ filter: "drop-shadow(0 2px 8px rgba(0,174,239,0.4))" }}
            />
            <span className="font-extrabold tracking-tight">Better Body Academy</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/help" className="text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              Help
            </Link>
            <Link href="https://bbapt.vercel.app" className="text-[var(--color-blue-glow)] font-semibold">
              Open app →
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-[var(--color-line)] mt-16">
        <div className="max-w-3xl mx-auto px-6 py-8 flex items-center justify-between gap-4 text-xs text-[var(--color-subtle)]">
          <span>&copy; {new Date().getFullYear()} Better Body Academy</span>
          <Link href="/help" className="hover:text-[var(--color-ink)]">All docs</Link>
        </div>
      </footer>
    </div>
  );
}
