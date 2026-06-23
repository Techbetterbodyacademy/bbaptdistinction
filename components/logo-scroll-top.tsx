"use client";

import { type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function LogoScrollTop({ children, className }: Props) {
  return (
    <a
      href="#top"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        if (typeof window === "undefined") return;
        const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
      }}
      aria-label="Scroll to top"
    >
      {children}
    </a>
  );
}
