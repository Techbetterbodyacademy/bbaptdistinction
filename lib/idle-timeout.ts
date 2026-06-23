export const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const WARNING_BEFORE_MS = 2 * 60 * 1000; // 2-minute warning

export type IdleState = "active" | "warning" | "expired";

export type IdleSnapshot = {
  state: IdleState;
  remainingMs: number;
};

export function computeIdleState(lastActivityMs: number, nowMs: number): IdleSnapshot {
  const elapsed = nowMs - lastActivityMs;
  const remaining = Math.max(0, IDLE_TIMEOUT_MS - elapsed);

  if (elapsed >= IDLE_TIMEOUT_MS) {
    return { state: "expired", remainingMs: 0 };
  }
  if (remaining <= WARNING_BEFORE_MS) {
    return { state: "warning", remainingMs: remaining };
  }
  return { state: "active", remainingMs: remaining };
}

export function formatRemaining(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
