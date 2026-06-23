export const TRAINER_ROLES = ["owner", "trainer", "assistant"] as const;
export type TrainerRole = typeof TRAINER_ROLES[number];

export type TrainerInviteInput = {
  email: string;
  role: TrainerRole;
  full_name?: string;
};

export type TrainerInviteRecord = {
  email: string;
  role: TrainerRole;
  full_name: string | null;
};

export type PrepareResult<T> = { ok: true; record: T } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function prepareTrainerInvite(input: TrainerInviteInput): PrepareResult<TrainerInviteRecord> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false, error: "email required" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "email invalid" };
  if (!TRAINER_ROLES.includes(input.role)) return { ok: false, error: "role invalid" };
  const fullName = input.full_name?.trim() ?? "";
  return {
    ok: true,
    record: { email, role: input.role, full_name: fullName.length ? fullName : null }
  };
}

export type Permission =
  | "view_clients"
  | "manage_clients"
  | "view_billing"
  | "manage_billing"
  | "invite_trainers"
  | "edit_settings";

const PERMISSIONS: Record<TrainerRole, Permission[]> = {
  owner: ["view_clients", "manage_clients", "view_billing", "manage_billing", "invite_trainers", "edit_settings"],
  trainer: ["view_clients", "manage_clients"],
  assistant: ["view_clients"]
};

export function canPerform(role: TrainerRole, permission: Permission): boolean {
  const perms = PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes(permission);
}
