"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Top-of-viewport navigation progress bar.
 * Shows when the user clicks an internal link, hides once the destination renders
 * (detected via pathname/searchParams changes).
 */
export function NavProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);

  // When pathname or search params change, the new page has rendered. Hide the bar.
  useEffect(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (safetyTimerRef.current !== null) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    // Brief delay so the user sees the bar reach 100% before it fades out
    hideTimerRef.current = window.setTimeout(() => setVisible(false), 220);
    return () => {
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    };
  }, [pathname]);

  // Intercept ALL clicks on internal anchors. If the click would navigate, show the bar.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Ignore modified clicks and non-primary buttons (they open in new tab / new window)
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = (e.target as HTMLElement | null)?.closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href) return;
      // Skip external links, hash links, mailto/tel, and download links
      if (href.startsWith("http://") || href.startsWith("https://")) {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
      }
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (target.hasAttribute("download")) return;
      if (target.getAttribute("target") === "_blank") return;

      setVisible(true);

      // Safety net: if pathname doesn't change within 8s (network stall, etc.) hide anyway
      if (safetyTimerRef.current !== null) window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = window.setTimeout(() => setVisible(false), 8000);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Also show the bar for form submissions (server actions) that navigate
  useEffect(() => {
    function onSubmit() {
      setVisible(true);
      if (safetyTimerRef.current !== null) window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = window.setTimeout(() => setVisible(false), 8000);
    }
    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, []);

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[100] h-0.5 pointer-events-none overflow-hidden"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease"
      }}
    >
      <div
        className="h-full bg-[var(--color-blue-glow)]"
        style={{
          boxShadow: "0 0 12px rgba(56,197,255,0.9)",
          animation: visible ? "nav-progress-slide 1.4s ease-in-out infinite" : "none",
          transformOrigin: "left center"
        }}
      />
      <style>{`
        @keyframes nav-progress-slide {
          0% { transform: translateX(-100%) scaleX(0.4); }
          50% { transform: translateX(0%) scaleX(0.8); }
          100% { transform: translateX(100%) scaleX(0.4); }
        }
      `}</style>
    </div>
  );
}
