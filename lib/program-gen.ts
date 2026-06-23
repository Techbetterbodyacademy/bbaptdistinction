export type ProgramGenSpec = {
  name: string;
  audience: string;
  weeks: number;
  sessions_per_week: number;
  goal: string;
  constraints?: string;
};

export type AIMessage = { role: "system" | "user"; content: string };

const SYSTEM_PROMPT = `You design strength + conditioning programs for Better Body Academy.

VOICE
- Direct, plainspoken, slightly Aussie. No fluff, no hype.
- NEVER use em-dashes or en-dashes anywhere. Use periods, commas, colons.
- Coach notes are short and concrete.

DESIGN PRINCIPLES
- Compound lifts first when possible.
- Respect any constraints supplied (injuries, equipment limits, time).
- Progressive overload across weeks. Add reps, sets, or load each week.
- Set realistic RPE (6-8 for hypertrophy, 7-9 for strength).
- Rest 60-120s for hypertrophy, 120-240s for strength.

OUTPUT
Respond ONLY with valid JSON in this shape:
{
  "name": string,
  "description": string,
  "weeks": [
    {
      "week_number": int,
      "workouts": [
        {
          "day_number": int (1-7),
          "name": string,
          "notes": string | null,
          "exercises": [
            {
              "name": string,
              "target_sets": int,
              "target_reps": string (e.g. "6-8", "10", "AMRAP"),
              "target_rpe": number | null,
              "rest_seconds": int | null,
              "notes": string | null
            }
          ]
        }
      ]
    }
  ]
}`;

export function buildProgramPrompt(spec: ProgramGenSpec): AIMessage[] {
  const userPayload = {
    name: spec.name,
    audience: spec.audience,
    weeks: spec.weeks,
    sessions_per_week: spec.sessions_per_week,
    goal: spec.goal,
    constraints: spec.constraints ?? null
  };
  const user = `Design this program. Return the JSON.\n\n${JSON.stringify(userPayload, null, 2)}`;
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: user }
  ];
}

export type ProgramExercise = {
  name: string;
  target_sets: number | null;
  target_reps: string | null;
  target_rpe: number | null;
  rest_seconds: number | null;
  notes: string | null;
};

export type ProgramWorkout = {
  day_number: number;
  name: string;
  notes: string | null;
  exercises: ProgramExercise[];
};

export type ProgramWeek = {
  week_number: number;
  workouts: ProgramWorkout[];
};

export type ParsedProgram = {
  name: string;
  description: string;
  weeks: ProgramWeek[];
};

export type ParseResult =
  | { ok: true; program: ParsedProgram }
  | { ok: false; error: string };

export function parseProgramResponse(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "invalid json" };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "response is not an object" };
  }
  const obj = parsed as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  if (!name) return { ok: false, error: "program name missing" };

  const description = typeof obj.description === "string" ? obj.description : "";

  if (!Array.isArray(obj.weeks) || obj.weeks.length === 0) {
    return { ok: false, error: "weeks array missing or empty" };
  }

  const weeks: ProgramWeek[] = [];
  for (const w of obj.weeks) {
    if (!w || typeof w !== "object") return { ok: false, error: "invalid week entry" };
    const week = w as Record<string, unknown>;
    const week_number = typeof week.week_number === "number" ? week.week_number : Number(week.week_number);
    if (!Number.isInteger(week_number)) return { ok: false, error: "week_number invalid" };
    if (!Array.isArray(week.workouts)) return { ok: false, error: "workouts not an array" };

    const workouts: ProgramWorkout[] = [];
    for (const wk of week.workouts) {
      if (!wk || typeof wk !== "object") return { ok: false, error: "invalid workout entry" };
      const workout = wk as Record<string, unknown>;
      const day_number = typeof workout.day_number === "number" ? workout.day_number : Number(workout.day_number);
      if (!Number.isInteger(day_number)) return { ok: false, error: "day_number invalid" };

      if (!Array.isArray(workout.exercises) || workout.exercises.length === 0) {
        return { ok: false, error: "workout must have at least one exercise" };
      }

      const exercises: ProgramExercise[] = [];
      for (const e of workout.exercises) {
        if (!e || typeof e !== "object") return { ok: false, error: "invalid exercise entry" };
        const ex = e as Record<string, unknown>;
        const exName = typeof ex.name === "string" ? ex.name.trim() : "";
        if (!exName) return { ok: false, error: "exercise name missing" };
        exercises.push({
          name: exName,
          target_sets: typeof ex.target_sets === "number" ? ex.target_sets : null,
          target_reps: typeof ex.target_reps === "string" ? ex.target_reps : null,
          target_rpe: typeof ex.target_rpe === "number" ? ex.target_rpe : null,
          rest_seconds: typeof ex.rest_seconds === "number" ? ex.rest_seconds : null,
          notes: typeof ex.notes === "string" ? ex.notes : null
        });
      }

      workouts.push({
        day_number,
        name: typeof workout.name === "string" ? workout.name : `Day ${day_number}`,
        notes: typeof workout.notes === "string" ? workout.notes : null,
        exercises
      });
    }

    weeks.push({ week_number, workouts });
  }

  return {
    ok: true,
    program: { name, description, weeks }
  };
}
