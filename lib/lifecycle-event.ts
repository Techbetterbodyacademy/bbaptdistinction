import type { LifecycleStage } from "./jase-watches";

export const LIFECYCLE_EVENT_TYPES = [
  "catchup_call",
  "retreat",
  "kickoff_call",
  "celebration_call",
  "strategy_call"
] as const;
export type LifecycleEventType = typeof LIFECYCLE_EVENT_TYPES[number];

export type LifecycleEventStatus = "scheduled" | "completed" | "no_show" | "cancelled";

export type LifecycleEventInput = {
  client_id: string;
  event_type: LifecycleEventType;
  scheduled_for: string;
  duration_minutes: number;
  notes?: string;
};

export type LifecycleEventRecord = {
  client_id: string;
  event_type: LifecycleEventType;
  scheduled_for: string;
  duration_minutes: number;
  notes: string | null;
};

export type PrepareResult =
  | { ok: true; record: LifecycleEventRecord }
  | { ok: false; error: string };

export function prepareLifecycleEvent(input: LifecycleEventInput): PrepareResult {
  if (!input.client_id) return { ok: false, error: "client_id required" };
  if (!LIFECYCLE_EVENT_TYPES.includes(input.event_type)) {
    return { ok: false, error: "event_type invalid" };
  }
  const scheduledMs = Date.parse(input.scheduled_for);
  if (Number.isNaN(scheduledMs)) {
    return { ok: false, error: "scheduled_for must be a valid ISO date" };
  }
  if (scheduledMs <= Date.now()) {
    return { ok: false, error: "scheduled_for must be in the future" };
  }
  if (!Number.isInteger(input.duration_minutes) || input.duration_minutes <= 0) {
    return { ok: false, error: "duration_minutes must be a positive integer" };
  }
  const notes = input.notes?.trim() ?? "";
  return {
    ok: true,
    record: {
      client_id: input.client_id,
      event_type: input.event_type,
      scheduled_for: input.scheduled_for,
      duration_minutes: input.duration_minutes,
      notes: notes.length ? notes : null
    }
  };
}

export type LifecycleEventRow = {
  id: string;
  event_type: LifecycleEventType;
  scheduled_for: string;
  status: LifecycleEventStatus;
};

export type Partition = {
  today: LifecycleEventRow[];
  thisWeek: LifecycleEventRow[];
  later: LifecycleEventRow[];
  past: LifecycleEventRow[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function partitionUpcomingEvents(rows: LifecycleEventRow[], now: Date): Partition {
  const part: Partition = { today: [], thisWeek: [], later: [], past: [] };
  const nowMs = now.getTime();
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay.getTime() + DAY_MS);
  const endOfWeek = new Date(startOfDay.getTime() + 7 * DAY_MS);

  for (const r of rows) {
    if (r.status === "completed" || r.status === "cancelled" || r.status === "no_show") {
      part.past.push(r);
      continue;
    }
    const t = Date.parse(r.scheduled_for);
    if (Number.isNaN(t)) continue;
    if (t < nowMs && t < startOfDay.getTime()) {
      part.past.push(r);
    } else if (t < endOfDay.getTime()) {
      part.today.push(r);
    } else if (t < endOfWeek.getTime()) {
      part.thisWeek.push(r);
    } else {
      part.later.push(r);
    }
  }

  const sortByTime = (a: LifecycleEventRow, b: LifecycleEventRow) =>
    Date.parse(a.scheduled_for) - Date.parse(b.scheduled_for);
  part.today.sort(sortByTime);
  part.thisWeek.sort(sortByTime);
  part.later.sort(sortByTime);
  part.past.sort((a, b) => Date.parse(b.scheduled_for) - Date.parse(a.scheduled_for));

  return part;
}

export function stageFromEventType(type: LifecycleEventType): LifecycleStage | null {
  switch (type) {
    case "catchup_call":
      return "catchup_call";
    case "retreat":
      return "retreat";
    case "kickoff_call":
      return "kickoff";
    case "celebration_call":
      return "celebration";
    case "strategy_call":
      return null;
  }
}
