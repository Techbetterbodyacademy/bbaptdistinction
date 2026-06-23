export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "athlete";
export type Goal = "cut" | "maintain" | "gain";
export type Sex = "male" | "female" | "neutral";

export type MacroInput = {
  age: number;
  heightCm: number;
  weightKg: number;
  sex: Sex;
  activity: ActivityLevel;
  goal: Goal;
};

export type MacroResult = { calories: number; proteinG: number };

const ACTIVITY: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9
};

const GOAL_CAL: Record<Goal, number> = { cut: -500, maintain: 0, gain: 400 };
const GOAL_PROTEIN_PER_KG: Record<Goal, number> = { cut: 2.0, maintain: 1.6, gain: 1.8 };

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function computeMacros(input: MacroInput): MacroResult {
  const { age, heightCm, weightKg, sex, activity, goal } = input;

  // Mifflin-St Jeor BMR
  let bmr: number;
  if (sex === "male") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else if (sex === "female") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 78;
  }

  const tdee = bmr * ACTIVITY[activity];
  const calories = Math.round(clamp(tdee + GOAL_CAL[goal], 1200, 5000));
  const proteinG = Math.round(clamp(weightKg * GOAL_PROTEIN_PER_KG[goal], 50, 400));

  return { calories, proteinG };
}
