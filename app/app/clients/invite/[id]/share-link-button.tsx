"use client";

import { useState } from "react";

export function ShareLinkButton({ inviteId }: { inviteId: string }) {
  const [state, setState] = useState<
    | { stage: "idle" }
    | { stage: "loading" }
    | { stage: "ready"; link: string; copied: boolean }
    | { stage: "error"; message: string }
  >({ stage: "idle" });

  async function generate() {
    setState({ stage: "loading" });
    try {
      const res = await fetch(`/api/invites/${inviteId}/link`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error ?? `Failed (${res.status})`);
      }
      if (!body?.link) {
        throw new Error("Response missing link");
      }
      setState({ stage: "ready", link: body.link, copied: false });
    } catch (e) {
      setState({ stage: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }

  async function copy() {
    if (state.stage !== "ready") return;
    try {
      await navigator.clipboard.writeText(state.link);
      setState({ ...state, copied: true });
      setTimeout(() => setState((s) => (s.stage === "ready" ? { ...s, copied: false } : s)), 1800);
    } catch {
      // ignore, user can select the text manually
    }
  }

  return (
    <div>
      <div
        className={`font-mono text-xs bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg p-4 mb-4 break-all min-h-[60px] flex items-center ${
          state.stage === "ready"
            ? "text-[var(--color-ink)]"
            : state.stage === "error"
              ? "text-[var(--color-danger)]"
              : "text-[var(--color-subtle)]"
        }`}
      >
        {state.stage === "ready" && state.link}
        {state.stage === "error" && `Error: ${state.message}`}
        {state.stage === "loading" && "Generating..."}
        {state.stage === "idle" && "Click “Generate share link” to create"}
      </div>

      <div className="flex items-center gap-3">
        {state.stage !== "ready" ? (
          <button
            type="button"
            onClick={generate}
            disabled={state.stage === "loading"}
            className="btn btn-primary"
          >
            {state.stage === "loading"
              ? "Generating..."
              : state.stage === "error"
                ? "Try again"
                : "Generate share link"}
          </button>
        ) : (
          <button type="button" onClick={copy} className="btn btn-primary">
            {state.copied ? "Copied!" : "Copy to clipboard"}
          </button>
        )}
      </div>
    </div>
  );
}
