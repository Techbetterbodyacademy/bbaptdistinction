import type { LifecycleStage } from "./jase-watches";

const VALID_STAGES: LifecycleStage[] = [
  "onboarding",
  "kickoff",
  "momentum",
  "celebration",
  "challenge_upgrade",
  "catchup_call",
  "retreat",
  "renewed",
  "offboarded"
];

const REQUIRED_HEADERS = ["full_name", "email"] as const;
const ALL_HEADERS = ["full_name", "email", "age", "height_cm", "current_weight_kg", "lifecycle_stage"] as const;
type Header = (typeof ALL_HEADERS)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RawClientRow = {
  full_name: string;
  email: string;
  age: number | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  lifecycle_stage: string;
};

export type ClientRecord = {
  full_name: string;
  email: string;
  age: number | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  lifecycle_stage: LifecycleStage;
};

export type ParseResult =
  | { ok: true; rows: RawClientRow[] }
  | { ok: false; error: string };

export type RowResult =
  | { ok: true; record: ClientRecord }
  | { ok: false; error: string };

// Minimal CSV tokenizer: supports quoted fields with commas inside.
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  let cur = "";
  let inQuotes = false;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 2;
        continue;
      }
      if (ch === '"') {
        inQuotes = false;
        i++;
        continue;
      }
      cur += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      out.push(cur);
      cur = "";
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function nullableInt(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseClientCsv(csv: string): ParseResult {
  const lines = csv.split(/\r?\n/).map((l) => l.trimEnd());
  if (lines.length === 0) {
    return { ok: false, error: "empty CSV" };
  }
  const headerLine = lines[0];
  if (!headerLine) return { ok: false, error: "missing header row" };

  const headers = parseCsvLine(headerLine).map((h) => h.toLowerCase());
  for (const required of REQUIRED_HEADERS) {
    if (!headers.includes(required)) {
      return { ok: false, error: `missing required column: ${required}` };
    }
  }

  const indexOf = (name: Header): number => headers.indexOf(name);

  const rows: RawClientRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === "") continue;
    const cells = parseCsvLine(line);

    const get = (name: Header): string => {
      const idx = indexOf(name);
      return idx === -1 ? "" : (cells[idx] ?? "").trim();
    };

    rows.push({
      full_name: get("full_name"),
      email: get("email").toLowerCase(),
      age: nullableInt(get("age")),
      height_cm: nullableInt(get("height_cm")),
      current_weight_kg: nullableInt(get("current_weight_kg")),
      lifecycle_stage: get("lifecycle_stage").toLowerCase()
    });
  }

  return { ok: true, rows };
}

export function prepareClientRow(input: RawClientRow): RowResult {
  const full_name = input.full_name.trim();
  if (!full_name) return { ok: false, error: "name required" };
  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false, error: "email required" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "email invalid" };

  const stageRaw = (input.lifecycle_stage || "onboarding").trim().toLowerCase();
  if (!VALID_STAGES.includes(stageRaw as LifecycleStage)) {
    return { ok: false, error: `lifecycle_stage invalid (got "${stageRaw}")` };
  }
  const lifecycle_stage = stageRaw as LifecycleStage;

  if (input.age !== null && (input.age < 13 || input.age > 120)) {
    return { ok: false, error: `age out of range (got ${input.age})` };
  }

  return {
    ok: true,
    record: {
      full_name,
      email,
      age: input.age,
      height_cm: input.height_cm,
      current_weight_kg: input.current_weight_kg,
      lifecycle_stage
    }
  };
}
