"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

type Props = {
  firstName: string;
  workspaceName: string;
};

const NAV_LINKS = [
  { href: "/client", label: "Home" },
  { href: "/client/program", label: "Program" },
  { href: "/client/meal-plan", label: "Meal plan" },
  { href: "/client/habits", label: "Habits" },
  { href: "/client/sessions", label: "Sessions" },
  { href: "/client/checkins", label: "Check-ins" },
  { href: "/client/logbook", label: "Logbook" },
  { href: "/client/library", label: "Library" },
  { href: "/client/messages", label: "Messages" }
];

export function ClientNav({ firstName, workspaceName }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="border-b border-[var(--color-line)] bg-[var(--color-bg-deep)] sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold truncate">
            {workspaceName}
          </div>
          <div className="text-base font-extrabold truncate">
            Hey, {firstName}.
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/client" && pathname.startsWith(link.href + "/"));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "text-[var(--color-blue-glow)] bg-[rgba(0,174,239,0.1)] font-semibold"
                    : "text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[rgba(255,255,255,0.04)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <form action="/auth/logout" method="post" className="ml-2">
            <button
              type="submit"
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] px-3 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)]"
            >
              Sign out
            </button>
          </form>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="lg:hidden p-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)] shrink-0"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </div>

      {/* Mobile menu overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-[rgba(0,0,0,0.85)] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[var(--color-bg-deep)] border-b border-[var(--color-line)] min-h-screen flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--color-line)]">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">
                  {workspaceName}
                </div>
                <div className="text-base font-extrabold">Hey, {firstName}.</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)]"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href || (link.href !== "/client" && pathname.startsWith(link.href + "/"));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block px-4 py-3 rounded-xl text-base transition-colors ${
                      isActive
                        ? "text-[var(--color-blue-glow)] bg-[rgba(0,174,239,0.1)] font-semibold"
                        : "text-[var(--color-ink)] hover:bg-[rgba(255,255,255,0.04)]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <form action="/auth/logout" method="post" className="p-3 border-t border-[var(--color-line)]">
              <button
                type="submit"
                className="w-full text-left px-4 py-3 rounded-xl text-base text-[var(--color-muted)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--color-ink)] transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
