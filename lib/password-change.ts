export type PasswordChangeInput = {
  password: string;
  confirm: string;
};

export type PrepareResult =
  | { ok: true; record: { password: string } }
  | { ok: false; error: string };

export function preparePasswordChange(input: PasswordChangeInput): PrepareResult {
  if (!input.password) return { ok: false, error: "password required" };
  if (input.password.length < 8) return { ok: false, error: "password must be at least 8 characters" };
  if (input.password.length > 72) return { ok: false, error: "password must be 72 characters or fewer" };
  if (input.password !== input.confirm) return { ok: false, error: "confirmation must match" };
  return { ok: true, record: { password: input.password } };
}
