"use client";

import { useState, useTransition } from "react";
import { cancelInvite } from "./actions";

type Props = {
  inviteId: string;
  fullName: string;
};

export function CancelInviteButton({ inviteId, fullName }: Props) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--color-muted)]">
          Cancel invite for <strong>{fullName}</strong>?
        </span>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="btn btn-ghost text-sm"
        >
          Keep it
        </button>
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              await cancelInvite(inviteId);
            })
          }
          disabled={pending}
          className="text-sm px-4 py-2 rounded-xl font-bold bg-[var(--color-ink)] text-[var(--color-bg)] hover:bg-[var(--color-muted)] transition-colors disabled:opacity-50"
        >
          {pending ? "Cancelling..." : "Yes, cancel invite"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="btn btn-ghost text-sm"
    >
      Cancel invite
    </button>
  );
}
