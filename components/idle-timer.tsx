"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  IDLE_TIMEOUT_MS,
  WARNING_BEFORE_MS,
  computeIdleState,
  formatRemaining
} from "@/lib/idle-timeout";

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "focus"
];

// Throttle activity events so we don't spam state updates on every mouse-move
function throttle(fn: () => void, intervalMs: number) {
  let last = 0;
  return () => {
    const now = Date.now();
    if (now - last >= intervalMs) {
      last = now;
      fn();
    }
  };
}

export function IdleTimer() {
  const [now, setNow] = useState<number>(() => Date.now());
  const lastActivityRef = useRef<number>(Date.now());
  const expiredRef = useRef<boolean>(false);

  const reset = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    const throttled = throttle(reset, 5_000);
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, throttled, { passive: true }));

    const tick = window.setInterval(() => setNow(Date.now()), 1_000);

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, throttled));
      window.clearInterval(tick);
    };
  }, [reset]);

  const snapshot = computeIdleState(lastActivityRef.current, now);

  useEffect(() => {
    if (snapshot.state === "expired" && !expiredRef.current) {
      expiredRef.current = true;
      // POST to the existing logout endpoint, then redirect to /login
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/auth/logout";
      document.body.appendChild(form);
      form.submit();
    }
  }, [snapshot.state]);

  if (snapshot.state !== "warning") return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-surface)] border border-[var(--color-warn)] rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-4 max-w-[90vw]"
      style={{ minWidth: 320 }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[1.5px] font-bold text-[var(--color-warn)] mb-1">
          Signing you out soon
        </div>
        <div className="text-sm text-[var(--color-ink)]">
          Inactive too long. Auto sign-out in <strong className="font-mono">{formatRemaining(snapshot.remainingMs)}</strong>.
        </div>
      </div>
      <button
        type="button"
        onClick={reset}
        className="btn btn-primary text-sm shrink-0"
      >
        Stay signed in
      </button>
    </div>
  );
}
