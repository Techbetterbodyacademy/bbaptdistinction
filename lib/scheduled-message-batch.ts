export type ScheduledRow = {
  id: string;
  thread_id: string;
  sender_user_id: string;
  body: string;
  scheduled_for: string;
  status: "pending" | "sent" | "cancelled";
};

export type PartitionResult = {
  due: ScheduledRow[];
  notYet: ScheduledRow[];
  skipped: ScheduledRow[];
};

export function partitionDueScheduledMessages(
  rows: ScheduledRow[],
  now: Date
): PartitionResult {
  const due: ScheduledRow[] = [];
  const notYet: ScheduledRow[] = [];
  const skipped: ScheduledRow[] = [];
  const nowMs = now.getTime();

  for (const row of rows) {
    if (row.status !== "pending") {
      skipped.push(row);
      continue;
    }
    const scheduledMs = Date.parse(row.scheduled_for);
    if (Number.isNaN(scheduledMs) || scheduledMs > nowMs) {
      notYet.push(row);
      continue;
    }
    due.push(row);
  }

  return { due, notYet, skipped };
}
