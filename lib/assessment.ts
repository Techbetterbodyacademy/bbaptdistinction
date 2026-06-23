export type ROMScore = "poor" | "fair" | "good";

export function scoreROM(degrees: number, targetDegrees: number): ROMScore {
  if (!Number.isFinite(targetDegrees) || targetDegrees <= 0) {
    throw new Error("targetDegrees must be > 0");
  }
  const ratio = degrees / targetDegrees;
  if (ratio < 0.5) return "poor";
  if (ratio < 0.8) return "fair";
  return "good";
}

export type AssessmentKind = "postural" | "movement" | "strength" | "mobility" | "cardio";
const VALID_KINDS: AssessmentKind[] = ["postural", "movement", "strength", "mobility", "cardio"];

export type AssessmentInput = {
  title: string;
  kind: AssessmentKind;
  notes?: string;
};

export type AssessmentRecord = {
  title: string;
  kind: AssessmentKind;
  notes: string | null;
};

export type PrepareResult =
  | { ok: true; record: AssessmentRecord }
  | { ok: false; error: string };

export function prepareAssessmentInput(input: AssessmentInput): PrepareResult {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "title required" };
  if (!VALID_KINDS.includes(input.kind)) return { ok: false, error: "kind must be one of: " + VALID_KINDS.join(", ") };
  const notes = input.notes?.trim() ?? "";
  return {
    ok: true,
    record: {
      title,
      kind: input.kind,
      notes: notes.length ? notes : null
    }
  };
}
