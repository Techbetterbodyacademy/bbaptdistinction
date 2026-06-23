import { z } from "zod";

export const CUISINES = ["italian", "asian", "mediterranean", "mexican", "american"] as const;
export const GOALS = ["cut", "maintain", "gain"] as const;
export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "athlete"] as const;
export const SEXES = ["male", "female", "neutral"] as const;
export const DIET_STYLES = ["omnivore"] as const;

export const MemberIntake = z.object({
  age: z.number().int().min(16).max(99),
  heightCm: z.number().min(120).max(230),
  weightKg: z.number().min(35).max(250),
  sex: z.enum(SEXES),
  activity: z.enum(ACTIVITY_LEVELS),
  goal: z.enum(GOALS),
  calories: z.number().int().min(1200).max(5000),
  proteinG: z.number().int().min(50).max(400),
  mealsPerDay: z.number().int().min(3).max(6),
  fastBreakfast: z.boolean(),
  cuisines: z.array(z.enum(CUISINES)),
  allergies: z.string().max(500),
  dietStyle: z.enum(DIET_STYLES),
  trainingDays: z.number().int().min(0).max(7)
});
export type MemberIntake = z.infer<typeof MemberIntake>;

const Macros = z.object({
  calories: z.number().int().nonnegative(),
  proteinG: z.number().int().nonnegative(),
  carbsG: z.number().int().nonnegative(),
  fatG: z.number().int().nonnegative()
});

export const Meal = z.object({
  name: z.string().min(1),
  calories: z.number().int().nonnegative(),
  proteinG: z.number().int().nonnegative(),
  carbsG: z.number().int().nonnegative(),
  fatG: z.number().int().nonnegative(),
  ingredients: z.array(z.string().min(1)).min(1)
});
export type Meal = z.infer<typeof Meal>;

export const Day = z.object({
  day: z.string().min(1),
  totals: Macros,
  meals: z.array(Meal).min(1)
});
export type Day = z.infer<typeof Day>;

export const ShoppingList = z.object({
  produce: z.array(z.string()),
  proteins: z.array(z.string()),
  grainsCarbs: z.array(z.string()),
  dairyEggs: z.array(z.string()),
  pantry: z.array(z.string()),
  other: z.array(z.string())
});
export type ShoppingList = z.infer<typeof ShoppingList>;

export const Plan = z.object({
  coachNote: z.string().min(1),
  days: z.array(Day).length(7),
  shoppingList: ShoppingList
});
export type Plan = z.infer<typeof Plan>;
