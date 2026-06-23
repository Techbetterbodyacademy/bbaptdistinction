export type GroupInput = {
  name: string;
  description?: string;
};

export type GroupRecord = {
  name: string;
  description: string | null;
};

export type PrepareResult =
  | { ok: true; record: GroupRecord }
  | { ok: false; error: string };

const NAME_MAX = 80;

export function prepareGroupInput(input: GroupInput): PrepareResult {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "name required" };
  if (name.length > NAME_MAX) return { ok: false, error: "name too long" };
  const description = input.description?.trim() ?? "";
  return {
    ok: true,
    record: {
      name,
      description: description.length ? description : null
    }
  };
}

export type GroupMemberRow = {
  client_id: string;
  full_name: string | null;
  status: "active" | "paused" | "completed";
};

export type GroupRoster = {
  total: number;
  active: number;
  paused: number;
  completed: number;
  members: GroupMemberRow[];
};

export function computeGroupRoster(rows: GroupMemberRow[]): GroupRoster {
  let active = 0;
  let paused = 0;
  let completed = 0;
  for (const r of rows) {
    if (r.status === "active") active++;
    else if (r.status === "paused") paused++;
    else completed++;
  }
  const members = rows.slice().sort((a, b) => {
    // Nulls last
    if (a.full_name === null && b.full_name !== null) return 1;
    if (b.full_name === null && a.full_name !== null) return -1;
    if (a.full_name === null && b.full_name === null) return 0;
    return (a.full_name as string).localeCompare(b.full_name as string);
  });
  return { total: rows.length, active, paused, completed, members };
}
