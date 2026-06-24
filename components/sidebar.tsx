"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

type NavItem = {
  href: string;
  label: string;
  count?: number;
  soon?: boolean;
};

type LibraryChild = NavItem & { icon: React.ReactNode; tint: string };

const PRIMARY_NAV: NavItem[] = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/watches", label: "Business health" },
  { href: "/app/calendar", label: "Calendar" },
  { href: "/app/clients", label: "Clients" },
  { href: "/app/groups", label: "Groups" },
  { href: "/app/checkins", label: "Check-ins" },
  { href: "/app/messages", label: "Messages" },
  { href: "/app/community", label: "Community" },
  { href: "/app/assistant", label: "AI Assistant" },
  { href: "/app/workflows", label: "Workflows" },
  { href: "/app/packages", label: "Packages" },
  { href: "/app/mini-site", label: "Mini site" }
];

const LIBRARY_CHILDREN: LibraryChild[] = [
  { href: "/app/programs", label: "Programs", tint: "rgb(20, 184, 166)", icon: <GridIcon /> },
  { href: "/app/library", label: "Exercises", tint: "rgb(59, 130, 246)", icon: <DumbbellIcon /> },
  { href: "/app/assessments", label: "Assessment", tint: "rgb(107, 114, 128)", icon: <ClipboardIcon /> },
  { href: "/app/results", label: "Results Tracking", tint: "rgb(168, 85, 247)", icon: <ChartIcon /> },
  { href: "/app/forms", label: "Forms & Questionnaires", tint: "rgb(34, 197, 94)", icon: <FormIcon /> },
  { href: "/app/resources", label: "Coaching", tint: "rgb(234, 179, 8)", icon: <ClockIcon /> },
  { href: "/app/habits", label: "Habits", tint: "rgb(249, 115, 22)", icon: <CheckCircleIcon /> }
];

const SECONDARY_NAV: NavItem[] = [
  { href: "/app/team", label: "Team access" },
  { href: "/app/settings/account", label: "Sign-in settings" },
  { href: "/app/settings/workspace", label: "Workspace settings" },
  { href: "/app/settings/billing", label: "Billing", soon: true }
];

export type SidebarCounts = {
  messages?: number;
  checkins?: number;
  clients?: number;
};

export function Sidebar({
  workspaceName,
  coachName,
  counts
}: {
  workspaceName: string;
  coachName: string;
  counts?: SidebarCounts;
}) {
  const pathname = usePathname();

  // Inject counts into the nav items at render time so the indicator badges show up.
  const primaryNavWithCounts: NavItem[] = PRIMARY_NAV.map((item) => {
    if (!counts) return item;
    if (item.href === "/app/messages" && counts.messages) return { ...item, count: counts.messages };
    if (item.href === "/app/checkins" && counts.checkins) return { ...item, count: counts.checkins };
    if (item.href === "/app/clients" && counts.clients) return { ...item, count: counts.clients };
    return item;
  });

  const isLibraryActive = LIBRARY_CHILDREN.some(
    (l) => pathname === l.href || pathname.startsWith(l.href + "/")
  );
  const [libraryOpen, setLibraryOpen] = useState(isLibraryActive);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (isLibraryActive) setLibraryOpen(true);
  }, [isLibraryActive]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const sidebarBody = (
    <>
      <div className="px-5 py-5 border-b border-[var(--color-line)] flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bba-badge.png"
          alt="Better Body Academy"
          className="w-11 h-11 shrink-0 rounded-full"
          style={{ filter: "drop-shadow(0 4px 14px rgba(0,174,239,0.35))" }}
        />
        <div className="min-w-0 flex-1">
          <div className="text-base font-extrabold truncate">{workspaceName}</div>
          <div className="text-xs text-[var(--color-muted)] truncate">{coachName}</div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          className="lg:hidden p-2 -mr-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)]"
        >
          <CloseIcon />
        </button>
      </div>

      <nav className="px-3 py-4 flex-1 overflow-y-auto">
        <NavGroup label="Coach" items={primaryNavWithCounts} pathname={pathname}>
          <LibraryDropdown
            pathname={pathname}
            isActive={isLibraryActive}
            open={libraryOpen}
            onToggle={() => setLibraryOpen((v) => !v)}
          />
        </NavGroup>
        <div className="h-4" />
        <NavGroup label="Settings" items={SECONDARY_NAV} pathname={pathname} />
      </nav>

      <form action="/auth/logout" method="post" className="border-t border-[var(--color-line)] p-3">
        <button
          type="submit"
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--color-muted)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--color-ink)] transition-colors"
        >
          Sign out
        </button>
      </form>
    </>
  );

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div className="lg:hidden sticky top-0 z-30 bg-[var(--color-bg-deep)] border-b border-[var(--color-line)] flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="p-2 -ml-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)]"
        >
          <MenuIcon />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/bba-badge.png"
            alt="BBA"
            className="w-7 h-7 rounded-full shrink-0"
            style={{ filter: "drop-shadow(0 2px 8px rgba(0,174,239,0.35))" }}
          />
          <span className="text-sm font-extrabold truncate">{workspaceName}</span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[260px] shrink-0 border-r border-[var(--color-line)] bg-[var(--color-bg-deep)] flex-col">
        {sidebarBody}
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-[rgba(0,0,0,0.85)] backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="w-[280px] max-w-[85vw] h-full bg-[var(--color-bg-deep)] border-r border-[var(--color-line)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarBody}
          </aside>
        </div>
      )}
    </>
  );
}

function NavGroup({
  label,
  items,
  pathname,
  children
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="px-3 mb-2 text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">
        {label}
      </div>
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          if (item.soon) {
            return (
              <li key={item.href}>
                <div
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-[var(--color-subtle)] cursor-not-allowed"
                  aria-disabled="true"
                  title="Coming soon"
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] uppercase tracking-[1.5px] font-bold px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[var(--color-subtle)]">
                    Soon
                  </span>
                </div>
              </li>
            );
          }
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-[rgba(0,174,239,0.12)] text-[var(--color-blue-glow)] font-semibold"
                    : "text-[var(--color-muted)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--color-ink)]"
                }`}
              >
                <span className="flex items-center gap-2">
                  {item.label}
                  {typeof item.count === "number" && item.count > 0 ? (
                    <span
                      aria-label={`${item.count} new`}
                      className="w-1.5 h-1.5 rounded-full bg-[var(--color-blue-glow)] animate-pulse"
                      style={{ boxShadow: "0 0 8px rgba(56,197,255,0.6)" }}
                    />
                  ) : null}
                </span>
                {typeof item.count === "number" && item.count > 0 ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(0,174,239,0.12)] text-[var(--color-blue-glow)] font-bold border border-[rgba(0,174,239,0.25)] min-w-[24px] text-center">
                    {item.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
        {children ? <li>{children}</li> : null}
      </ul>
    </div>
  );
}

function LibraryDropdown({
  pathname,
  isActive,
  open,
  onToggle
}: {
  pathname: string;
  isActive: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? "bg-[rgba(0,174,239,0.12)] text-[var(--color-blue-glow)] font-semibold"
            : "text-[var(--color-muted)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--color-ink)]"
        }`}
        aria-expanded={open}
      >
        <span>Library</span>
        <ChevronDown open={open} />
      </button>

      {open ? (
        <ul className="mt-1 ml-2 pl-2 border-l border-[var(--color-line)] space-y-0.5">
          {LIBRARY_CHILDREN.map((child) => {
            const childActive = pathname === child.href || pathname.startsWith(child.href + "/");
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                    childActive
                      ? "bg-[rgba(0,174,239,0.12)] text-[var(--color-blue-glow)] font-semibold"
                      : "text-[var(--color-muted)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${child.tint}1f`, color: child.tint }}
                  >
                    {child.icon}
                  </span>
                  <span className="truncate">{child.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function DumbbellIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="5" width="2" height="6" rx="0.5" fill="currentColor" />
      <rect x="13" y="5" width="2" height="6" rx="0.5" fill="currentColor" />
      <rect x="3" y="6.5" width="2" height="3" fill="currentColor" />
      <rect x="11" y="6.5" width="2" height="3" fill="currentColor" />
      <rect x="5" y="7.25" width="6" height="1.5" fill="currentColor" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="3" width="10" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 8L6.5 9L8.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="9.5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M2 12L5 8L8 10L11 5L14 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FormIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="2" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <line x1="5.5" y1="5.5" x2="10.5" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5.5" y1="8" x2="10.5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5.5" y1="10.5" x2="8.5" y2="10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.5V8L10 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 8.5L7 10L10.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
