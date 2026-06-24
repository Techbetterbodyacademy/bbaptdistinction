"use client";

import { useState, useEffect } from "react";

type Props = {
  url?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZE: Record<NonNullable<Props["size"]>, { wh: string; text: string }> = {
  sm: { wh: "w-7 h-7", text: "text-xs" },
  md: { wh: "w-9 h-9", text: "text-sm" },
  lg: { wh: "w-12 h-12", text: "text-base" },
  xl: { wh: "w-20 h-20", text: "text-2xl" }
};

function initialsFromName(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Avatar({ url, name, size = "md", className = "" }: Props) {
  const { wh, text } = SIZE[size];
  const base = `${wh} rounded-full shrink-0 overflow-hidden border border-[var(--color-line)] ${className}`;
  const [failed, setFailed] = useState(false);

  // Reset the failed flag whenever the URL changes so a new upload re-attempts loading
  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (url && !failed) {
    return (
      <span className={base}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            console.error("[Avatar] image failed to load:", url, e);
            setFailed(true);
          }}
        />
      </span>
    );
  }

  const initials = initialsFromName(name);
  return (
    <span
      className={`${base} bg-[rgba(0,174,239,0.12)] flex items-center justify-center font-extrabold ${text} text-[var(--color-blue-glow)]`}
      aria-label={name}
    >
      {initials}
    </span>
  );
}
