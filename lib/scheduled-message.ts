export type ScheduledMessageInput = {
  thread_id: string;
  sender_user_id: string;
  body: string;
  scheduled_for: string;
};

export type ScheduledMessageRecord = {
  thread_id: string;
  sender_user_id: string;
  body: string;
  scheduled_for: string;
  status: "pending";
};

export type PrepareResult =
  | { ok: true; record: ScheduledMessageRecord }
  | { ok: false; error: string };

export function prepareScheduledMessage(input: ScheduledMessageInput): PrepareResult {
  if (!input.thread_id) {
    return { ok: false, error: "thread_id required" };
  }
  const body = input.body.trim();
  if (!body) {
    return { ok: false, error: "body required" };
  }
  const scheduledMs = Date.parse(input.scheduled_for);
  if (Number.isNaN(scheduledMs)) {
    return { ok: false, error: "scheduled_for must be a valid ISO date" };
  }
  if (scheduledMs <= Date.now()) {
    return { ok: false, error: "scheduled_for must be in the future" };
  }
  return {
    ok: true,
    record: {
      thread_id: input.thread_id,
      sender_user_id: input.sender_user_id,
      body,
      scheduled_for: input.scheduled_for,
      status: "pending"
    }
  };
}
