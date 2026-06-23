export type AIMessage = { role: "system" | "user"; content: string };

const SYSTEM_PROMPT = `You parse PT Distinction program templates into a clean JSON structure for the Better Body Academy coaching platform.

INPUT
The user will paste raw text copied from a PT Distinction program page. It typically contains:
- A program name (e.g. "2 - BEGINNER - GYM - 2 DAY - UPPER / LOWER")
- Phase / Week / Day organization
- Exercise lines like "A1. Goblet Squat 3 x 8-10 @ RPE 7, 90s rest"

VOICE
- Coach notes are short, direct, plainspoken.
- NEVER use em-dashes or en-dashes anywhere. Use periods, commas, or colons.

TASK
Extract the program into JSON. Be conservative: if a value is missing, return null rather than guessing.

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
              "target_sets": int | null,
              "target_reps": string | null (e.g. "6-8", "10", "AMRAP"),
              "target_rpe": number | null,
              "rest_seconds": int | null,
              "notes": string | null
            }
          ]
        }
      ]
    }
  ]
}

NOTES
- "3 x 8-10" means target_sets=3, target_reps="8-10".
- "@ RPE 7" sets target_rpe=7.
- "90s rest" or "rest 90" sets rest_seconds=90.
- Group exercises labeled A1/A2 as a superset by adding "Superset with [other]" to notes.
- If multiple weeks share identical workouts, still output them per week with the correct week_number.`;

export function buildPtdParsePrompt(rawText: string): AIMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Parse this PT Distinction program into the JSON shape.\n\n---\n${rawText}\n---` }
  ];
}
