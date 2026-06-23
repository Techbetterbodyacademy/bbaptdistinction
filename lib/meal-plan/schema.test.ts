import { describe, test, expect } from "vitest";
import { MemberIntake, Plan } from "./schema";

const validIntake = {
  age: 40,
  heightCm: 180,
  weightKg: 90,
  sex: "male",
  activity: "moderate",
  goal: "maintain",
  calories: 2800,
  proteinG: 144,
  mealsPerDay: 4,
  fastBreakfast: false,
  cuisines: ["italian", "mediterranean"],
  allergies: "tree nuts",
  dietStyle: "omnivore",
  trainingDays: 4
};

describe("MemberIntake", () => {
  test("accepts a valid intake", () => {
    expect(MemberIntake.safeParse(validIntake).success).toBe(true);
  });

  test("rejects age below 16", () => {
    expect(MemberIntake.safeParse({ ...validIntake, age: 15 }).success).toBe(false);
  });

  test("rejects age above 99", () => {
    expect(MemberIntake.safeParse({ ...validIntake, age: 100 }).success).toBe(false);
  });

  test("rejects calories below 1200", () => {
    expect(MemberIntake.safeParse({ ...validIntake, calories: 1199 }).success).toBe(false);
  });

  test("rejects calories above 5000", () => {
    expect(MemberIntake.safeParse({ ...validIntake, calories: 5001 }).success).toBe(false);
  });

  test("rejects protein below 50", () => {
    expect(MemberIntake.safeParse({ ...validIntake, proteinG: 49 }).success).toBe(false);
  });

  test("rejects mealsPerDay outside 3-6", () => {
    expect(MemberIntake.safeParse({ ...validIntake, mealsPerDay: 2 }).success).toBe(false);
    expect(MemberIntake.safeParse({ ...validIntake, mealsPerDay: 7 }).success).toBe(false);
  });

  test("rejects unknown cuisine", () => {
    expect(MemberIntake.safeParse({ ...validIntake, cuisines: ["fusion"] }).success).toBe(false);
  });

  test("accepts empty cuisines", () => {
    expect(MemberIntake.safeParse({ ...validIntake, cuisines: [] }).success).toBe(true);
  });
});

const validPlan = {
  coachNote: "Hit your protein every day, prioritise sleep.",
  days: Array.from({ length: 7 }, (_, i) => ({
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
    totals: { calories: 2800, proteinG: 144, carbsG: 280, fatG: 90 },
    meals: [
      { name: "Greek yogurt + berries", calories: 400, proteinG: 30, carbsG: 50, fatG: 8, ingredients: ["yogurt", "berries"] },
      { name: "Chicken bowl", calories: 600, proteinG: 50, carbsG: 60, fatG: 15, ingredients: ["chicken", "rice"] }
    ]
  })),
  shoppingList: {
    produce: ["berries", "spinach"],
    proteins: ["chicken", "yogurt"],
    grainsCarbs: ["rice"],
    dairyEggs: ["yogurt"],
    pantry: ["olive oil"],
    other: []
  }
};

describe("Plan", () => {
  test("accepts a valid plan", () => {
    expect(Plan.safeParse(validPlan).success).toBe(true);
  });

  test("requires exactly 7 days", () => {
    const six = { ...validPlan, days: validPlan.days.slice(0, 6) };
    expect(Plan.safeParse(six).success).toBe(false);
    const eight = { ...validPlan, days: [...validPlan.days, validPlan.days[0]] };
    expect(Plan.safeParse(eight).success).toBe(false);
  });

  test("rejects negative macros", () => {
    const bad = JSON.parse(JSON.stringify(validPlan));
    bad.days[0].totals.calories = -10;
    expect(Plan.safeParse(bad).success).toBe(false);
  });

  test("rejects empty meal name", () => {
    const bad = JSON.parse(JSON.stringify(validPlan));
    bad.days[0].meals[0].name = "";
    expect(Plan.safeParse(bad).success).toBe(false);
  });

  test("rejects empty ingredients list on a meal", () => {
    const bad = JSON.parse(JSON.stringify(validPlan));
    bad.days[0].meals[0].ingredients = [];
    expect(Plan.safeParse(bad).success).toBe(false);
  });
});
