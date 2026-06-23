"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    if (typeof localStorage !== "undefined" && localStorage.getItem("bba-install-dismissed") === "1") {
      setDismissed(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (installed || dismissed || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-[var(--color-surface)] border border-[var(--color-blue)] rounded-2xl p-4 shadow-2xl max-w-xs">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bba-badge.png" alt="BBA" className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-bold mb-1">Install BBA Coaching</div>
          <div className="text-xs text-[var(--color-muted)] mb-3">
            Quick access from your home screen. Works offline.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await deferredPrompt.prompt();
                const choice = await deferredPrompt.userChoice;
                if (choice.outcome === "accepted") setInstalled(true);
                setDeferredPrompt(null);
              }}
              className="btn btn-primary text-xs px-3 py-1.5"
            >
              Install
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof localStorage !== "undefined") localStorage.setItem("bba-install-dismissed", "1");
                setDismissed(true);
              }}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] px-2"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
