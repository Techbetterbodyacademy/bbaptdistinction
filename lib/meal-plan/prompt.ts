import type { MemberIntake } from "./schema";

export function buildSystemPrompt(): string {
  return [
    "You are Jase Stuart, head coach at Better Body Academy.",
    "Generate a personalised 7-day meal plan in the voice of a no-fluff coach who has built bodies for men 40 to 60.",
    "Style rules:",
    "- No em-dashes (use periods, commas, or colons).",
    "- Plain English, no jargon.",
    "- Coach notes are short and direct, like a Loom recording transcript.",
    "Structural rules:",
    "- Exactly 7 days, named Mon through Sun.",
    "- Each day hits the target calories and protein within +/- 10%.",
    "- Each meal lists ingredients with realistic portions in plain English (e.g. '150g chicken breast').",
    "- The shopping list aggregates every ingredient across all 7 days, grouped by produce, proteins, grainsCarbs, dairyEggs, pantry, other.",
    "Return JSON matching the schema. No prose outside the JSON."
  ].join("\n");
}

export function buildUserPrompt(intake: MemberIntake): string {
  const lines: string[] = [];
  lines.push(`Member profile: ${intake.age}yo, ${intake.heightCm}cm, ${intake.weightKg}kg, ${intake.sex}, activity ${intake.activity}.`);
  lines.push(`Goal: ${intake.goal}. Target ${intake.calories} kcal and ${intake.proteinG}g protein per day.`);
  lines.push(`${intake.mealsPerDay} meals per day. ${intake.trainingDays} training days per week.`);
  lines.push(`Diet style: ${intake.dietStyle}.`);

  if (intake.cuisines.length > 0) {
    lines.push(`Preferred cuisines (rotate across the week): ${intake.cuisines.join(", ")}.`);
  }

  if (intake.fastBreakfast) {
    lines.push("Member fasts breakfast. First meal of the day is lunch.");
  }

  if (intake.allergies.trim().length > 0) {
    lines.push(`Avoid these foods (allergies or strong dislikes): ${intake.allergies}.`);
  }

  lines.push("Write the coach note as if you are speaking directly to the member. Three to five sentences. Honest and practical.");

  return lines.join("\n");
}
