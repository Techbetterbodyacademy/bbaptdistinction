"use client";

import { useEffect, useRef, useState } from "react";
import { parseStatValue, valueAtProgress, formatStatValue } from "@/lib/counter-anim";

type Props = {
  value: string;
  durationMs?: number;
  className?: string;
};

export function AnimatedCounter({ value, durationMs = 1600, className }: Props) {
  const { value: target, prefix, suffix } = parseStatValue(value);
  const [display, setDisplay] = useState<string>(formatStatValue(0, prefix, suffix));
  const ref = useRef<HTMLSpanElement | null>(null);
  const startedRef = useRef<boolean>(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setDisplay(formatStatValue(target, prefix, suffix));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            const startTime = performance.now();
            const step = (now: number) => {
              const progress = Math.min(1, (now - startTime) / durationMs);
              const current = valueAtProgress(0, target, progress);
              setDisplay(formatStatValue(current, prefix, suffix));
              if (progress < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, prefix, suffix, durationMs]);

  return (
    <span ref={ref} className={className} aria-label={value}>
      {display}
    </span>
  );
}
