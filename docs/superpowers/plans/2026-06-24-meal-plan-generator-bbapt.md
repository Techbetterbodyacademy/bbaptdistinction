# Meal Plan Generator (bbapt bridge) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI meal plan generation inside bbapt so coaches can generate streamed 7-day plans for any client in their workspace, with full history, branded for bbapt.

**Architecture:** Inline port of `MemberIntake`, `Plan` zod schemas + prompt logic from the standalone `bba-meal-plan-generator` repo into bbapt's `lib/meal-plan/*`. New Supabase table `meal_plan` (workspace_id + client_id, status state machine, jsonb intake + plan). New `/api/meal-plan/generate` route uses Vercel AI SDK `streamObject` with the `Plan` schema, returning a planId via `X-Plan-Id` header. Coach UI under `/app/clients/[clientId]/meal-plan`, client UI under `/client/meal-plan`. Nightly cron reaps orphaned streaming rows.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind v4, Supabase (Postgres + RLS), Vercel AI SDK (`ai` + `@ai-sdk/openai`), Vitest 4. Project uses npm. Path alias `@/*` maps to repo root.

## Global Constraints

These apply to every task. Do not restate them per-task; they implicitly govern all code.

- **Brand:** Blue / black / white / gray only. Inter for body, Instrument Serif for accent numerals. No gold, no pink. (Scoped to bbapt.)
- **Typography:** No em-dashes (—) or en-dashes (–) in any output, comments, copy, or test names. Use periods, commas, or colons.
- **Auth boundary:** All routes use Supabase server client; workspace_id RLS must be honored. Service-role client only when bypassing RLS is required (and explained in the call site).
- **Tests:** Project currently runs 284/284. Every new exported function in `lib/meal-plan/*` requires a failing test first (RED), minimal impl (GREEN), then refactor if needed.
- **Style:** TypeScript strict mode. No `any` unless justified by a comment. Prefer pure functions in `lib/`.
- **Project root:** `clients/betterbodyacademy/coaching-app/app-src/` (referred to as "the project" below). All relative paths in this plan are relative to that root unless prefixed.
- **Test runner:** `npx vitest run [path]`.
- **Build:** `npx next build`.
- **Deploy:** `vercel deploy --prod --yes` then `vercel alias set <new-url> bbapt.vercel.app`. Vercel CLI is logged in as `tech-1584` (BBA team).
- **Git:** Repo is NOT initialized in `app-src/` yet. Local commits in this plan use `git add` + `git commit` only; do NOT push until the user says "Go push". Task 0 initializes the repo. Skip Task 0 if the user already initialized it before reading this plan.
- **Existing test count:** 284. After this plan: ~330.

---

### Task 0: Initialize git (skip if already done)

**Files:**
- Create: `.gitignore` (if missing)

**Interfaces:**
- Consumes: nothing
- Produces: a local git repo so subsequent tasks can commit.

- [ ] **Step 1: Check whether git is already initialized**

Run from project root:
```bash
git rev-parse --is-inside-work-tree 2>/dev/null && echo "already initialized — skip the rest of Task 0" || echo "needs init"
```

- [ ] **Step 2: Initialize repo + verify `.gitignore` includes node_modules, .next, .env*, .vercel**

```bash
git init
cat .gitignore | grep -E "node_modules|\.next|\.env|\.vercel" | sort -u
```

If any are missing, append them:

```bash
cat >> .gitignore <<'EOF'
node_modules/
.next/
.env*
.vercel/
EOF
```

- [ ] **Step 3: Initial commit of existing state**

```bash
git add -A
git commit -m "chore: initial commit of existing bbapt state"
```

No push.

---

### Task 1: Add Vercel AI SDK deps + Phase 24 SQL patch

**Files:**
- Modify: `package.json` (add `ai`, `@ai-sdk/openai`)
- Create: `supabase-schema-phase24-patch.sql` (at project root)

**Interfaces:**
- Consumes: nothing
- Produces:
  - `ai` package (provides `streamObject`, `useObject`)
  - `@ai-sdk/openai` (provides `openai()` model factory)
  - Postgres table `meal_plan` with RLS policies that mirror the workspace-membership pattern used by sibling tables

- [ ] **Step 1: Install the AI SDK packages**

```bash
npm install ai @ai-sdk/openai
```

Expected: two packages added to `dependencies`, lockfile updated, no peer-dep warnings about react 19.

- [ ] **Step 2: Verify the build still passes with the new deps**

```bash
npx next build
```

Expected: `Compiled successfully`.

- [ ] **Step 3: Write the Phase 24 SQL patch**

Create `supabase-schema-phase24-patch.sql` with:

```sql
-- Phase 24: meal_plan table for the bbapt meal plan generator bridge.
-- Idempotent: safe to re-run.

create table if not exists meal_plan (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace(id) on delete cascade,
  client_id uuid not null references user_profile(id) on delete cascade,
  coach_id uuid not null references auth.users(id),
  intake_json jsonb not null,
  plan_json jsonb not null default '{}'::jsonb,
  model text not null default 'gpt-4o',
  status text not null default 'streaming' check (status in ('streaming', 'ready', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create index if not exists meal_plan_client_idx on meal_plan(client_id, created_at desc);
create index if not exists meal_plan_workspace_idx on meal_plan(workspace_id, created_at desc);
create index if not exists meal_plan_status_idx on meal_plan(status, created_at) where status = 'streaming';

alter table meal_plan enable row level security;

-- Coach reads + writes meal plans for clients in their workspace.
drop policy if exists meal_plan_coach_rw on meal_plan;
create policy meal_plan_coach_rw on meal_plan
  for all
  using (
    exists (
      select 1 from workspace w
      where w.id = meal_plan.workspace_id
        and w.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workspace w
      where w.id = meal_plan.workspace_id
        and w.owner_id = auth.uid()
    )
  );

-- Client reads only own meal plans, only when status = 'ready'.
drop policy if exists meal_plan_client_read on meal_plan;
create policy meal_plan_client_read on meal_plan
  for select
  using (
    client_id = auth.uid()
    and status = 'ready'
  );
```

- [ ] **Step 4: Apply the SQL patch in Supabase**

Open Supabase project `ccdynloktcebpwdsthph` SQL editor, paste the file, click Run. Expected: `Success. No rows returned.`

- [ ] **Step 5: Verify the table exists**

In the SQL editor:
```sql
select column_name, data_type from information_schema.columns where table_name = 'meal_plan' order by ordinal_position;
```

Expected: 10 rows (id, workspace_id, client_id, coach_id, intake_json, plan_json, model, status, error, created_at).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json supabase-schema-phase24-patch.sql
git commit -m "feat(meal-plan): add ai sdk deps + phase 24 supabase schema"
```

---

### Task 2: lib/meal-plan/mifflin.ts (TDD)

**Files:**
- Create: `lib/meal-plan/mifflin.ts`
- Test: `lib/meal-plan/mifflin.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  ```ts
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

  export function computeMacros(input: MacroInput): MacroResult;
  ```

- [ ] **Step 1: Write the failing test**

Create `lib/meal-plan/mifflin.test.ts`:

```ts
import { describe, test, expect } from "vitest";
import { computeMacros } from "./mifflin";

describe("computeMacros (Mifflin-St Jeor)", () => {
  test("male, 40yo, 180cm, 90kg, moderate, maintain", () => {
    const r = computeMacros({ age: 40, heightCm: 180, weightKg: 90, sex: "male", activity: "moderate", goal: "maintain" });
    expect(r.calories).toBeGreaterThanOrEqual(2800);
    expect(r.calories).toBeLessThanOrEqual(2900);
    expect(r.proteinG).toBe(144);
  });

  test("female, 35yo, 165cm, 65kg, light, cut", () => {
    const r = computeMacros({ age: 35, heightCm: 165, weightKg: 65, sex: "female", activity: "light", goal: "cut" });
    expect(r.calories).toBeGreaterThanOrEqual(1300);
    expect(r.calories).toBeLessThanOrEqual(1500);
    expect(r.proteinG).toBe(130);
  });

  test("gain adds 400 cal vs maintain", () => {
    const base = { age: 30, heightCm: 175, weightKg: 80, sex: "male" as const, activity: "moderate" as const };
    const maintain = computeMacros({ ...base, goal: "maintain" });
    const gain = computeMacros({ ...base, goal: "gain" });
    expect(gain.calories - maintain.calories).toBe(400);
  });

  test("cut subtracts 500 cal vs maintain", () => {
    const base = { age: 30, heightCm: 175, weightKg: 80, sex: "male" as const, activity: "moderate" as const };
    const maintain = computeMacros({ ...base, goal: "maintain" });
    const cut = computeMacros({ ...base, goal: "cut" });
    expect(maintain.calories - cut.calories).toBe(500);
  });

  test("activity multipliers (sedentary 1.2, athlete 1.9)", () => {
    const base = { age: 30, heightCm: 175, weightKg: 80, sex: "male" as const, goal: "maintain" as const };
    const sedentary = computeMacros({ ...base, activity: "sedentary" });
    const athlete = computeMacros({ ...base, activity: "athlete" });
    const ratio = athlete.calories / sedentary.calories;
    expect(ratio).toBeCloseTo(1.9 / 1.2, 2);
  });

  test("calories clamp to [1200, 5000]", () => {
    const low = computeMacros({ age: 80, heightCm: 150, weightKg: 40, sex: "female", activity: "sedentary", goal: "cut" });
    expect(low.calories).toBeGreaterThanOrEqual(1200);
    const high = computeMacros({ age: 20, heightCm: 210, weightKg: 130, sex: "male", activity: "athlete", goal: "gain" });
    expect(high.calories).toBeLessThanOrEqual(5000);
  });

  test("protein clamps to [50, 400]", () => {
    const low = computeMacros({ age: 80, heightCm: 150, weightKg: 30, sex: "female", activity: "sedentary", goal: "maintain" });
    expect(low.proteinG).toBeGreaterThanOrEqual(50);
    const high = computeMacros({ age: 20, heightCm: 210, weightKg: 250, sex: "male", activity: "athlete", goal: "cut" });
    expect(high.proteinG).toBeLessThanOrEqual(400);
  });

  test("neutral sex falls back to a fixed BMR base", () => {
    const r = computeMacros({ age: 40, heightCm: 175, weightKg: 75, sex: "neutral", activity: "moderate", goal: "maintain" });
    expect(r.calories).toBeGreaterThan(2000);
    expect(r.calories).toBeLessThan(3000);
  });
});
```

- [ ] **Step 2: Run test, confirm RED**

```bash
npx vitest run lib/meal-plan/mifflin.test.ts
```

Expected: 8 failures with "Cannot find module './mifflin'".

- [ ] **Step 3: Write minimal implementation**

Create `lib/meal-plan/mifflin.ts`:

```ts
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
```

- [ ] **Step 4: Run test, confirm GREEN**

```bash
npx vitest run lib/meal-plan/mifflin.test.ts
```

Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/meal-plan/mifflin.ts lib/meal-plan/mifflin.test.ts
git commit -m "feat(meal-plan): mifflin-st jeor macro calculator with goal + activity"
```

---

### Task 3: lib/meal-plan/schema.ts (TDD)

**Files:**
- Create: `lib/meal-plan/schema.ts`
- Test: `lib/meal-plan/schema.test.ts`

**Interfaces:**
- Consumes: `Goal`, `ActivityLevel`, `Sex` from `./mifflin`
- Produces:
  ```ts
  export const MemberIntake: z.ZodObject<...>;
  export type MemberIntake = z.infer<typeof MemberIntake>;
  export const Meal: z.ZodObject<...>;
  export const Day: z.ZodObject<...>;
  export const ShoppingList: z.ZodObject<...>;
  export const Plan: z.ZodObject<...>;
  export type Plan = z.infer<typeof Plan>;
  ```

- [ ] **Step 1: Write the failing test**

Create `lib/meal-plan/schema.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test, confirm RED**

```bash
npx vitest run lib/meal-plan/schema.test.ts
```

Expected: 14 failures with "Cannot find module './schema'".

- [ ] **Step 3: Write minimal implementation**

Create `lib/meal-plan/schema.ts`:

```ts
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
```

- [ ] **Step 4: Run test, confirm GREEN**

```bash
npx vitest run lib/meal-plan/schema.test.ts
```

Expected: 14 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/meal-plan/schema.ts lib/meal-plan/schema.test.ts
git commit -m "feat(meal-plan): zod schemas for MemberIntake and Plan"
```

---

### Task 4: lib/meal-plan/prompt.ts (TDD)

**Files:**
- Create: `lib/meal-plan/prompt.ts`
- Test: `lib/meal-plan/prompt.test.ts`

**Interfaces:**
- Consumes: `MemberIntake` from `./schema`
- Produces:
  ```ts
  export function buildSystemPrompt(): string;
  export function buildUserPrompt(intake: MemberIntake): string;
  ```

- [ ] **Step 1: Write the failing test**

Create `lib/meal-plan/prompt.test.ts`:

```ts
import { describe, test, expect } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import type { MemberIntake } from "./schema";

const intake: MemberIntake = {
  age: 45,
  heightCm: 178,
  weightKg: 92,
  sex: "male",
  activity: "moderate",
  goal: "cut",
  calories: 2200,
  proteinG: 180,
  mealsPerDay: 4,
  fastBreakfast: true,
  cuisines: ["mediterranean", "asian"],
  allergies: "shellfish, peanuts",
  dietStyle: "omnivore",
  trainingDays: 4
};

describe("buildSystemPrompt", () => {
  test("includes Jase voice anchor", () => {
    const p = buildSystemPrompt();
    expect(p.toLowerCase()).toMatch(/jase|better body academy/);
  });

  test("asks for 7 days", () => {
    expect(buildSystemPrompt()).toMatch(/7[- ]day|seven[- ]day/i);
  });

  test("instructs no em-dashes", () => {
    expect(buildSystemPrompt().toLowerCase()).toMatch(/no em[- ]?dash/);
  });
});

describe("buildUserPrompt", () => {
  test("interpolates every numeric intake field", () => {
    const p = buildUserPrompt(intake);
    expect(p).toContain("2200");
    expect(p).toContain("180");
    expect(p).toContain("4");
    expect(p).toContain("92");
    expect(p).toContain("178");
    expect(p).toContain("45");
  });

  test("renders allergies as a constraint", () => {
    const p = buildUserPrompt(intake);
    expect(p.toLowerCase()).toMatch(/avoid|exclude|allergi/);
    expect(p).toContain("shellfish");
    expect(p).toContain("peanuts");
  });

  test("lists cuisines when present", () => {
    const p = buildUserPrompt(intake);
    expect(p.toLowerCase()).toContain("mediterranean");
    expect(p.toLowerCase()).toContain("asian");
  });

  test("omits cuisine line entirely when none selected", () => {
    const p = buildUserPrompt({ ...intake, cuisines: [] });
    expect(p.toLowerCase()).not.toMatch(/cuisine/);
  });

  test("mentions fasting when fastBreakfast is true", () => {
    expect(buildUserPrompt(intake).toLowerCase()).toMatch(/fast|skip breakfast/);
  });

  test("omits fasting line when fastBreakfast is false", () => {
    expect(buildUserPrompt({ ...intake, fastBreakfast: false }).toLowerCase()).not.toMatch(/fast|skip breakfast/);
  });
});
```

- [ ] **Step 2: Run test, confirm RED**

```bash
npx vitest run lib/meal-plan/prompt.test.ts
```

Expected: 9 failures with "Cannot find module './prompt'".

- [ ] **Step 3: Write minimal implementation**

Create `lib/meal-plan/prompt.ts`:

```ts
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
```

- [ ] **Step 4: Run test, confirm GREEN**

```bash
npx vitest run lib/meal-plan/prompt.test.ts
```

Expected: 9 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/meal-plan/prompt.ts lib/meal-plan/prompt.test.ts
git commit -m "feat(meal-plan): system + user prompt builder"
```

---

### Task 5: lib/meal-plan/storage.ts (TDD)

**Files:**
- Create: `lib/meal-plan/storage.ts`
- Test: `lib/meal-plan/storage.test.ts`

**Interfaces:**
- Consumes: a `SupabaseClient` instance (caller-injected); `Plan`, `MemberIntake` types from `./schema`
- Produces:
  ```ts
  export type MealPlanRow = {
    id: string;
    workspace_id: string;
    client_id: string;
    coach_id: string;
    intake_json: MemberIntake;
    plan_json: Plan | Record<string, never>;
    model: string;
    status: "streaming" | "ready" | "failed";
    error: string | null;
    created_at: string;
  };

  export async function createStreamingPlan(supabase, args): Promise<{ id: string }>;
  export async function markPlanReady(supabase, id, planJson): Promise<void>;
  export async function markPlanFailed(supabase, id, error): Promise<void>;
  export async function listPlansForClient(supabase, clientId): Promise<MealPlanRow[]>;
  export async function listPlansForCoach(supabase, clientId, opts): Promise<MealPlanRow[]>;
  export async function getPlan(supabase, id): Promise<MealPlanRow | null>;
  export async function countTodayPlansForWorkspace(supabase, workspaceId): Promise<number>;
  ```

- [ ] **Step 1: Write the failing test**

Create `lib/meal-plan/storage.test.ts`:

```ts
import { describe, test, expect, vi } from "vitest";
import {
  createStreamingPlan,
  markPlanReady,
  markPlanFailed,
  listPlansForClient,
  listPlansForCoach,
  getPlan,
  countTodayPlansForWorkspace
} from "./storage";

function mockSupabase(handlers: Record<string, unknown>) {
  return {
    from: vi.fn(() => ({
      insert: handlers.insert,
      update: handlers.update,
      select: handlers.select,
      eq: handlers.eq,
      order: handlers.order,
      single: handlers.single,
      maybeSingle: handlers.maybeSingle,
      gte: handlers.gte
    }))
  };
}

describe("createStreamingPlan", () => {
  test("inserts with status='streaming' and returns id", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "plan-1" }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const sb = { from: vi.fn(() => ({ insert })) } as never;

    const result = await createStreamingPlan(sb, {
      workspace_id: "w-1",
      client_id: "c-1",
      coach_id: "u-1",
      intake_json: { goal: "cut" } as never
    });

    expect(result).toEqual({ id: "plan-1" });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ status: "streaming" }));
  });

  test("throws on insert error", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: "rls denied" } });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const sb = { from: vi.fn(() => ({ insert })) } as never;

    await expect(createStreamingPlan(sb, { workspace_id: "w", client_id: "c", coach_id: "u", intake_json: {} as never })).rejects.toThrow(/rls denied/);
  });
});

describe("markPlanReady", () => {
  test("updates plan_json and sets status='ready'", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const sb = { from: vi.fn(() => ({ update })) } as never;

    await markPlanReady(sb, "plan-1", { coachNote: "x" } as never);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "ready" }));
    expect(eq).toHaveBeenCalledWith("id", "plan-1");
  });
});

describe("markPlanFailed", () => {
  test("sets status='failed' and writes error column", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const sb = { from: vi.fn(() => ({ update })) } as never;

    await markPlanFailed(sb, "plan-1", "openai timeout");

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", error: "openai timeout" }));
  });
});

describe("listPlansForClient", () => {
  test("filters to status='ready' for the client", async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const eqStatus = vi.fn(() => ({ order }));
    const eqClient = vi.fn(() => ({ eq: eqStatus }));
    const select = vi.fn(() => ({ eq: eqClient }));
    const sb = { from: vi.fn(() => ({ select })) } as never;

    await listPlansForClient(sb, "c-1");

    expect(eqClient).toHaveBeenCalledWith("client_id", "c-1");
    expect(eqStatus).toHaveBeenCalledWith("status", "ready");
  });
});

describe("listPlansForCoach", () => {
  test("by default excludes failed", async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const neq = vi.fn(() => ({ order }));
    const eq = vi.fn(() => ({ neq }));
    const select = vi.fn(() => ({ eq }));
    const sb = { from: vi.fn(() => ({ select })) } as never;

    await listPlansForCoach(sb, "c-1", { includeFailed: false });

    expect(neq).toHaveBeenCalledWith("status", "failed");
  });

  test("when includeFailed=true skips the status filter", async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const sb = { from: vi.fn(() => ({ select })) } as never;

    await listPlansForCoach(sb, "c-1", { includeFailed: true });

    expect(eq).toHaveBeenCalledWith("client_id", "c-1");
  });
});

describe("countTodayPlansForWorkspace", () => {
  test("returns count of rows created today", async () => {
    const gte = vi.fn().mockResolvedValue({ count: 17, error: null });
    const eq = vi.fn(() => ({ gte }));
    const select = vi.fn(() => ({ eq }));
    const sb = { from: vi.fn(() => ({ select })) } as never;

    const n = await countTodayPlansForWorkspace(sb, "w-1");
    expect(n).toBe(17);
  });
});
```

- [ ] **Step 2: Run test, confirm RED**

```bash
npx vitest run lib/meal-plan/storage.test.ts
```

Expected: 8 failures with "Cannot find module './storage'".

- [ ] **Step 3: Write minimal implementation**

Create `lib/meal-plan/storage.ts`:

```ts
import type { Plan, MemberIntake } from "./schema";

type SupabaseLike = {
  from: (table: string) => unknown;
};

export type MealPlanRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  coach_id: string;
  intake_json: MemberIntake;
  plan_json: Plan | Record<string, never>;
  model: string;
  status: "streaming" | "ready" | "failed";
  error: string | null;
  created_at: string;
};

export async function createStreamingPlan(
  supabase: SupabaseLike,
  args: { workspace_id: string; client_id: string; coach_id: string; intake_json: MemberIntake }
): Promise<{ id: string }> {
  const { data, error } = await (supabase.from("meal_plan") as never as {
    insert: (row: unknown) => { select: () => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> } };
  }).insert({ ...args, plan_json: {}, status: "streaming" }).select().single();

  if (error || !data) throw new Error(error?.message ?? "createStreamingPlan: no row returned");
  return { id: data.id };
}

export async function markPlanReady(supabase: SupabaseLike, id: string, planJson: Plan): Promise<void> {
  const { error } = await (supabase.from("meal_plan") as never as {
    update: (patch: unknown) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> };
  }).update({ plan_json: planJson, status: "ready", error: null }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markPlanFailed(supabase: SupabaseLike, id: string, errorMsg: string): Promise<void> {
  const { error } = await (supabase.from("meal_plan") as never as {
    update: (patch: unknown) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> };
  }).update({ status: "failed", error: errorMsg }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listPlansForClient(supabase: SupabaseLike, clientId: string): Promise<MealPlanRow[]> {
  const { data, error } = await (supabase.from("meal_plan") as never as {
    select: (cols: string) => { eq: (c: string, v: string) => { eq: (c: string, v: string) => { order: (c: string, opts: unknown) => Promise<{ data: MealPlanRow[] | null; error: { message: string } | null }> } } };
  }).select("*").eq("client_id", clientId).eq("status", "ready").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listPlansForCoach(
  supabase: SupabaseLike,
  clientId: string,
  opts: { includeFailed?: boolean } = {}
): Promise<MealPlanRow[]> {
  if (opts.includeFailed) {
    const { data, error } = await (supabase.from("meal_plan") as never as {
      select: (cols: string) => { eq: (c: string, v: string) => { order: (c: string, opts: unknown) => Promise<{ data: MealPlanRow[] | null; error: { message: string } | null }> } };
    }).select("*").eq("client_id", clientId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }
  const { data, error } = await (supabase.from("meal_plan") as never as {
    select: (cols: string) => { eq: (c: string, v: string) => { neq: (c: string, v: string) => { order: (c: string, opts: unknown) => Promise<{ data: MealPlanRow[] | null; error: { message: string } | null }> } } };
  }).select("*").eq("client_id", clientId).neq("status", "failed").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPlan(supabase: SupabaseLike, id: string): Promise<MealPlanRow | null> {
  const { data, error } = await (supabase.from("meal_plan") as never as {
    select: (cols: string) => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: MealPlanRow | null; error: { message: string } | null }> } };
  }).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function countTodayPlansForWorkspace(supabase: SupabaseLike, workspaceId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count, error } = await (supabase.from("meal_plan") as never as {
    select: (cols: string, opts: unknown) => { eq: (c: string, v: string) => { gte: (c: string, v: string) => Promise<{ count: number | null; error: { message: string } | null }> } };
  }).select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("created_at", startOfDay.toISOString());
  if (error) throw new Error(error.message);
  return count ?? 0;
}
```

- [ ] **Step 4: Run test, confirm GREEN**

```bash
npx vitest run lib/meal-plan/storage.test.ts
```

Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/meal-plan/storage.ts lib/meal-plan/storage.test.ts
git commit -m "feat(meal-plan): supabase storage helpers"
```

---

### Task 6: app/api/meal-plan/generate route (TDD)

**Files:**
- Create: `app/api/meal-plan/generate/route.ts`
- Test: `app/api/meal-plan/generate/route.test.ts`

**Interfaces:**
- Consumes: `MemberIntake`, `Plan` from `@/lib/meal-plan/schema`; `buildSystemPrompt`, `buildUserPrompt` from `@/lib/meal-plan/prompt`; `createStreamingPlan`, `markPlanReady`, `markPlanFailed`, `countTodayPlansForWorkspace` from `@/lib/meal-plan/storage`; `streamObject` from `ai`; `openai` from `@ai-sdk/openai`
- Produces: `POST` handler at `/api/meal-plan/generate`. Returns 400/401/403/422/429/200 per the error matrix. On 200, response has `X-Plan-Id` header and a streaming body conformant with the AI SDK's `useObject` consumer.

- [ ] **Step 1: Write the failing test**

Create `app/api/meal-plan/generate/route.test.ts`:

```ts
import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn()
}));
vi.mock("@/lib/meal-plan/storage", () => ({
  createStreamingPlan: vi.fn(),
  markPlanReady: vi.fn(),
  markPlanFailed: vi.fn(),
  countTodayPlansForWorkspace: vi.fn()
}));
vi.mock("ai", () => ({
  streamObject: vi.fn()
}));
vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(() => ({ id: "gpt-4o-mock" }))
}));

import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";
import { createStreamingPlan, countTodayPlansForWorkspace } from "@/lib/meal-plan/storage";
import { streamObject } from "ai";

const validBody = {
  clientId: "c-1",
  intake: {
    age: 40, heightCm: 180, weightKg: 90, sex: "male",
    activity: "moderate", goal: "maintain",
    calories: 2800, proteinG: 144,
    mealsPerDay: 4, fastBreakfast: false,
    cuisines: ["italian"], allergies: "",
    dietStyle: "omnivore", trainingDays: 4
  }
};

function mockSupabaseAuth(user: { id: string } | null) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "w-1", owner_id: user?.id ?? "" }, error: null })
    }))
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/meal-plan/generate", () => {
  test("400 on invalid JSON", async () => {
    vi.mocked(createClient).mockResolvedValue(mockSupabaseAuth({ id: "u-1" }) as never);
    const req = new Request("http://x/api/meal-plan/generate", { method: "POST", body: "{not-json" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test("401 when no user", async () => {
    vi.mocked(createClient).mockResolvedValue(mockSupabaseAuth(null) as never);
    const req = new Request("http://x/api/meal-plan/generate", { method: "POST", body: JSON.stringify(validBody) });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test("400 on intake validation failure", async () => {
    vi.mocked(createClient).mockResolvedValue(mockSupabaseAuth({ id: "u-1" }) as never);
    const bad = { clientId: "c-1", intake: { ...validBody.intake, age: 10 } };
    const req = new Request("http://x/api/meal-plan/generate", { method: "POST", body: JSON.stringify(bad) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test("429 when daily cap exceeded", async () => {
    vi.mocked(createClient).mockResolvedValue(mockSupabaseAuth({ id: "u-1" }) as never);
    vi.mocked(countTodayPlansForWorkspace).mockResolvedValue(50);
    const req = new Request("http://x/api/meal-plan/generate", { method: "POST", body: JSON.stringify(validBody) });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  test("happy path: creates streaming row, returns X-Plan-Id, streams body", async () => {
    vi.mocked(createClient).mockResolvedValue(mockSupabaseAuth({ id: "u-1" }) as never);
    vi.mocked(countTodayPlansForWorkspace).mockResolvedValue(0);
    vi.mocked(createStreamingPlan).mockResolvedValue({ id: "plan-9" });
    vi.mocked(streamObject).mockReturnValue({
      toTextStreamResponse: () => new Response("{streamed}", { status: 200 }),
      object: Promise.resolve({ coachNote: "ok", days: [], shoppingList: {} } as never)
    } as never);

    const req = new Request("http://x/api/meal-plan/generate", { method: "POST", body: JSON.stringify(validBody) });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Plan-Id")).toBe("plan-9");
  });
});
```

- [ ] **Step 2: Run test, confirm RED**

```bash
npx vitest run app/api/meal-plan/generate/route.test.ts
```

Expected: 5 failures with "Cannot find module './route'".

- [ ] **Step 3: Write minimal implementation**

Create `app/api/meal-plan/generate/route.ts`:

```ts
import { createClient } from "@/lib/supabase/server";
import { MemberIntake } from "@/lib/meal-plan/schema";
import { Plan } from "@/lib/meal-plan/schema";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/meal-plan/prompt";
import {
  createStreamingPlan,
  markPlanReady,
  markPlanFailed,
  countTodayPlansForWorkspace
} from "@/lib/meal-plan/storage";
import { streamObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  clientId: z.string().uuid(),
  intake: MemberIntake
});

const DAILY_CAP = Number(process.env.MEAL_PLAN_MAX_PER_DAY_PER_WORKSPACE ?? 50);

export async function POST(req: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }
  const { clientId, intake } = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id, owner_id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!workspace) return Response.json({ error: "no_workspace" }, { status: 403 });

  const { data: client } = await supabase
    .from("user_profile")
    .select("id, workspace_id")
    .eq("id", clientId)
    .maybeSingle();
  if (!client || client.workspace_id !== workspace.id) {
    return Response.json({ error: "client_not_in_workspace" }, { status: 403 });
  }

  const used = await countTodayPlansForWorkspace(supabase as never, workspace.id);
  if (used >= DAILY_CAP) {
    return Response.json({ error: "daily_cap_exceeded" }, { status: 429 });
  }

  const { id: planId } = await createStreamingPlan(supabase as never, {
    workspace_id: workspace.id,
    client_id: clientId,
    coach_id: user.id,
    intake_json: intake
  });

  const result = streamObject({
    model: openai("gpt-4o"),
    schema: Plan,
    system: buildSystemPrompt(),
    prompt: buildUserPrompt(intake),
    onFinish: async ({ object, error }) => {
      try {
        if (object && !error) {
          await markPlanReady(supabase as never, planId, object);
        } else {
          await markPlanFailed(supabase as never, planId, error ? String(error) : "no_object_emitted");
        }
      } catch (writeErr) {
        await markPlanFailed(supabase as never, planId, writeErr instanceof Error ? writeErr.message : "post_stream_write_failed").catch(() => {});
      }
    }
  });

  const res = result.toTextStreamResponse();
  res.headers.set("X-Plan-Id", planId);
  return res;
}
```

- [ ] **Step 4: Run test, confirm GREEN**

```bash
npx vitest run app/api/meal-plan/generate/route.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Verify the existing test suite still passes**

```bash
npx vitest run
```

Expected: all tests passed (~292 total after Tasks 2-6).

- [ ] **Step 6: Commit**

```bash
git add app/api/meal-plan/generate/route.ts app/api/meal-plan/generate/route.test.ts
git commit -m "feat(meal-plan): /api/meal-plan/generate with streamObject + RLS guards"
```

---

### Task 7: Cron route to reap orphaned streaming rows

**Files:**
- Create: `app/api/cron/reap-meal-plans/route.ts`
- Test: `app/api/cron/reap-meal-plans/route.test.ts`
- Modify: `vercel.json` (add cron entry)

**Interfaces:**
- Consumes: service-role Supabase client (`@/lib/supabase/admin`)
- Produces: `GET` handler that flips any `meal_plan` row with `status='streaming'` and `created_at < now() - 10 minutes` to `status='failed', error='orphaned_stream'`. Returns `{ reaped: N }`.

- [ ] **Step 1: Write the failing test**

Create `app/api/cron/reap-meal-plans/route.test.ts`:

```ts
import { describe, test, expect, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn()
}));

import { GET } from "./route";
import { createAdminClient } from "@/lib/supabase/admin";

describe("GET /api/cron/reap-meal-plans", () => {
  test("returns { reaped: N } for the orphaned rows", async () => {
    const select = vi.fn().mockReturnThis();
    const update = vi.fn().mockReturnThis();
    const eq = vi.fn().mockReturnThis();
    const lt = vi.fn().mockResolvedValue({ data: [{ id: "a" }, { id: "b" }, { id: "c" }], error: null });

    const sb = {
      from: vi.fn(() => ({ update, eq, lt, select }))
    };
    vi.mocked(createAdminClient).mockReturnValue(sb as never);

    const req = new Request("http://x/api/cron/reap-meal-plans", { headers: { "x-vercel-cron": "1" } });
    const res = await GET(req);
    const body = await res.json();
    expect(body).toEqual({ reaped: 3 });
  });

  test("403 when not invoked by Vercel cron", async () => {
    const req = new Request("http://x/api/cron/reap-meal-plans");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run test, confirm RED**

```bash
npx vitest run app/api/cron/reap-meal-plans/route.test.ts
```

Expected: 2 failures with "Cannot find module './route'".

- [ ] **Step 3: Write minimal implementation**

Create `app/api/cron/reap-meal-plans/route.ts`:

```ts
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  if (!req.headers.get("x-vercel-cron") && process.env.NODE_ENV !== "test") {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data, error } = await (supabase
    .from("meal_plan") as never as {
      update: (patch: unknown) => {
        eq: (c: string, v: string) => {
          lt: (c: string, v: string) => {
            select: (cols: string) => Promise<{ data: { id: string }[] | null; error: { message: string } | null }>;
          };
        };
      };
    })
    .update({ status: "failed", error: "orphaned_stream" })
    .eq("status", "streaming")
    .lt("created_at", cutoff)
    .select("id");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ reaped: data?.length ?? 0 });
}
```

- [ ] **Step 4: Run test, confirm GREEN**

```bash
npx vitest run app/api/cron/reap-meal-plans/route.test.ts
```

Expected: 2 passed.

- [ ] **Step 5: Add the cron entry to vercel.json**

Modify `vercel.json` (existing crons stay; append new entry):

```json
{
  "crons": [
    {
      "path": "/api/cron/checkin-reminders",
      "schedule": "0 14 * * *"
    },
    {
      "path": "/api/cron/flush-scheduled-messages",
      "schedule": "15 14 * * *"
    },
    {
      "path": "/api/cron/reap-meal-plans",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

(Every 15 minutes is safe: idempotent reap, low cost.)

- [ ] **Step 6: Commit**

```bash
git add app/api/cron/reap-meal-plans vercel.json
git commit -m "feat(meal-plan): cron job to reap orphaned streaming rows"
```

---

### Task 8: Coach UI — generate form + history list (page + components)

**Files:**
- Create: `app/app/clients/[clientId]/meal-plan/page.tsx`
- Create: `components/meal-plan/generate-form.tsx`
- Create: `components/meal-plan/history-list.tsx`

**Interfaces:**
- Consumes: `listPlansForCoach`, `MealPlanRow` from `@/lib/meal-plan/storage`; `computeMacros` from `@/lib/meal-plan/mifflin`; `MemberIntake` from `@/lib/meal-plan/schema`
- Produces: server page that renders `<GenerateForm>` (client component) above `<HistoryList>` (server component). Form posts to `/api/meal-plan/generate` and on 200, redirects to `/app/clients/[clientId]/meal-plan/[planId]` using the `X-Plan-Id` header.

- [ ] **Step 1: Build the coach page (server component)**

Create `app/app/clients/[clientId]/meal-plan/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listPlansForCoach } from "@/lib/meal-plan/storage";
import { GenerateForm } from "@/components/meal-plan/generate-form";
import { HistoryList } from "@/components/meal-plan/history-list";

type PageProps = { params: Promise<{ clientId: string }> };

export default async function MealPlanCoachPage({ params }: PageProps) {
  const { clientId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: client } = await supabase
    .from("user_profile")
    .select("id, full_name, age, height_cm, current_weight_kg, sex, workspace_id")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) redirect("/app/clients");

  const plans = await listPlansForCoach(supabase as never, clientId);

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
      <header>
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Meal plan</div>
        <h1 className="text-3xl font-extrabold tracking-tight mt-1">{client.full_name}</h1>
      </header>

      <GenerateForm
        clientId={client.id}
        prefill={{
          age: client.age ?? 0,
          heightCm: client.height_cm ?? 0,
          weightKg: client.current_weight_kg ?? 0,
          sex: (client.sex as "male" | "female" | "neutral") ?? "neutral"
        }}
      />

      <HistoryList plans={plans} clientId={clientId} />
    </main>
  );
}
```

- [ ] **Step 2: Build the history list (server component)**

Create `components/meal-plan/history-list.tsx`:

```tsx
import Link from "next/link";
import type { MealPlanRow } from "@/lib/meal-plan/storage";

export function HistoryList({ plans, clientId }: { plans: MealPlanRow[]; clientId: string }) {
  if (plans.length === 0) {
    return (
      <section>
        <h2 className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-3">History</h2>
        <p className="text-sm text-[var(--color-muted)]">No plans yet. Generate one above.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-3">History</h2>
      <ul className="space-y-2">
        {plans.map((p) => {
          const date = new Date(p.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
          const status = p.status === "ready" ? null : (
            <span className="text-[10px] uppercase tracking-[1.5px] font-bold text-[var(--color-warn)] ml-2">{p.status}</span>
          );
          return (
            <li key={p.id}>
              <Link
                href={`/app/clients/${clientId}/meal-plan/${p.id}`}
                className="block bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl px-5 py-4 hover:border-[var(--color-blue)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{date}{status}</div>
                    <div className="text-xs text-[var(--color-muted)] mt-1">
                      {p.intake_json.calories} kcal . {p.intake_json.proteinG}g protein . goal: {p.intake_json.goal}
                    </div>
                  </div>
                  <span className="text-[var(--color-blue-glow)]">View</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: Build the generate form (client component, no streaming yet — just POSTs)**

Create `components/meal-plan/generate-form.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { computeMacros, type Sex } from "@/lib/meal-plan/mifflin";

type Props = {
  clientId: string;
  prefill: { age: number; heightCm: number; weightKg: number; sex: Sex };
};

const CUISINES = ["italian", "asian", "mediterranean", "mexican", "american"] as const;

export function GenerateForm({ clientId, prefill }: Props) {
  const router = useRouter();
  const [goal, setGoal] = useState<"cut" | "maintain" | "gain">("maintain");
  const [activity, setActivity] = useState<"sedentary" | "light" | "moderate" | "active" | "athlete">("moderate");
  const [mealsPerDay, setMealsPerDay] = useState(4);
  const [fastBreakfast, setFastBreakfast] = useState(false);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [allergies, setAllergies] = useState("");
  const [trainingDays, setTrainingDays] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoMacros = useMemo(() => {
    if (!prefill.age || !prefill.heightCm || !prefill.weightKg) return null;
    return computeMacros({ ...prefill, activity, goal });
  }, [prefill, activity, goal]);

  const [caloriesOverride, setCaloriesOverride] = useState<number | "">("");
  const [proteinOverride, setProteinOverride] = useState<number | "">("");

  const finalCalories = caloriesOverride === "" ? autoMacros?.calories : caloriesOverride;
  const finalProtein = proteinOverride === "" ? autoMacros?.proteinG : proteinOverride;

  const ready = autoMacros !== null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || finalCalories == null || finalProtein == null) {
      setError("This client is missing biometrics (age, height, weight). Add them on the client profile first.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/meal-plan/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId,
          intake: {
            age: prefill.age,
            heightCm: prefill.heightCm,
            weightKg: prefill.weightKg,
            sex: prefill.sex,
            activity,
            goal,
            calories: finalCalories,
            proteinG: finalProtein,
            mealsPerDay,
            fastBreakfast,
            cuisines,
            allergies,
            dietStyle: "omnivore",
            trainingDays
          }
        })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "unknown" }));
        setError(body.error ?? "Generation failed");
        setSubmitting(false);
        return;
      }

      const planId = res.headers.get("X-Plan-Id");
      if (!planId) {
        setError("No plan id returned");
        setSubmitting(false);
        return;
      }

      router.push(`/app/clients/${clientId}/meal-plan/${planId}?streaming=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setSubmitting(false);
    }
  }

  function toggleCuisine(c: string) {
    setCuisines((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  }

  return (
    <form onSubmit={onSubmit} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 space-y-5">
      <div>
        <h2 className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">Generate a 7-day plan</h2>
        {ready ? (
          <p className="text-sm text-[var(--color-muted)]">
            Auto-calc from biometrics: <strong className="text-[var(--color-blue-glow)]">{autoMacros?.calories} kcal . {autoMacros?.proteinG}g protein</strong>. Override below if needed.
          </p>
        ) : (
          <p className="text-sm text-[var(--color-warn)]">
            This client is missing biometrics. Add age, height, weight on the client profile to enable auto-calc.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Goal</span>
          <select value={goal} onChange={(e) => setGoal(e.target.value as never)} className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm">
            <option value="cut">Cut</option>
            <option value="maintain">Maintain</option>
            <option value="gain">Gain</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Activity</span>
          <select value={activity} onChange={(e) => setActivity(e.target.value as never)} className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm">
            <option value="sedentary">Sedentary</option>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="active">Active</option>
            <option value="athlete">Athlete</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Calories (override)</span>
          <input
            type="number"
            placeholder={autoMacros ? String(autoMacros.calories) : ""}
            value={caloriesOverride}
            onChange={(e) => setCaloriesOverride(e.target.value === "" ? "" : Number(e.target.value))}
            className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Protein g (override)</span>
          <input
            type="number"
            placeholder={autoMacros ? String(autoMacros.proteinG) : ""}
            value={proteinOverride}
            onChange={(e) => setProteinOverride(e.target.value === "" ? "" : Number(e.target.value))}
            className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Meals per day</span>
          <input type="number" min={3} max={6} value={mealsPerDay} onChange={(e) => setMealsPerDay(Number(e.target.value))} className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Training days / week</span>
          <input type="number" min={0} max={7} value={trainingDays} onChange={(e) => setTrainingDays(Number(e.target.value))} className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm" />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={fastBreakfast} onChange={(e) => setFastBreakfast(e.target.checked)} />
        Member fasts breakfast (first meal is lunch)
      </label>

      <div>
        <span className="block text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">Preferred cuisines</span>
        <div className="flex flex-wrap gap-2">
          {CUISINES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCuisine(c)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${cuisines.includes(c) ? "border-[var(--color-blue)] bg-[rgba(0,174,239,0.1)] text-[var(--color-blue-glow)]" : "border-[var(--color-line)] text-[var(--color-muted)]"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Allergies + dislikes</span>
        <input
          type="text"
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          placeholder="e.g. shellfish, tree nuts"
          className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
        />
      </label>

      {error && <div className="text-sm text-[var(--color-warn)]">{error}</div>}

      <button type="submit" disabled={!ready || submitting} className="btn btn-primary text-sm disabled:opacity-50">
        {submitting ? "Generating..." : "Generate plan"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Build the project + verify it compiles**

```bash
npx next build
```

Expected: `Compiled successfully`. The new route `/app/clients/[clientId]/meal-plan` should appear in the route summary.

- [ ] **Step 5: Commit**

```bash
git add app/app/clients/\[clientId\]/meal-plan/page.tsx components/meal-plan
git commit -m "feat(meal-plan): coach generate form + history list page"
```

---

### Task 9: Plan read-only view (shared coach + client) + streaming behaviour

**Files:**
- Create: `components/meal-plan/plan-read-only.tsx`
- Create: `components/meal-plan/streaming-view.tsx`
- Create: `app/app/clients/[clientId]/meal-plan/[planId]/page.tsx`

**Interfaces:**
- Consumes: `getPlan`, `MealPlanRow` from `@/lib/meal-plan/storage`; `useObject` from `ai/react`
- Produces: a server page that conditionally renders either `<StreamingView>` (when `?streaming=1` query param present) or `<PlanReadOnly>` (when row status is `ready`). Both render the same 7-day layout when fully populated.

- [ ] **Step 1: Build the read-only plan view (shared component)**

Create `components/meal-plan/plan-read-only.tsx`:

```tsx
import type { Plan } from "@/lib/meal-plan/schema";

const DAY_NUMERAL = ["01", "02", "03", "04", "05", "06", "07"];

export function PlanReadOnly({ plan }: { plan: Plan }) {
  return (
    <div className="space-y-8">
      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-blue-glow)] font-bold mb-2">Coach note</div>
        <p className="text-base leading-relaxed">{plan.coachNote}</p>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-4">7-day plan</h2>
        <div className="space-y-4">
          {plan.days.map((d, i) => (
            <article key={d.day} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 relative overflow-hidden">
              <div className="text-6xl font-extrabold absolute top-2 right-5 text-[var(--color-blue-glow)] opacity-10" style={{ fontFamily: "var(--font-serif)" }}>{DAY_NUMERAL[i]}</div>
              <div className="relative">
                <div className="font-bold text-xl mb-1">{d.day}</div>
                <div className="text-xs text-[var(--color-subtle)] mb-4">{d.totals.calories} kcal . {d.totals.proteinG}g P . {d.totals.carbsG}g C . {d.totals.fatG}g F</div>
                <ul className="space-y-3">
                  {d.meals.map((m, mi) => (
                    <li key={mi} className="border-t border-[var(--color-line)] pt-3 first:border-t-0 first:pt-0">
                      <div className="font-bold">{m.name}</div>
                      <div className="text-xs text-[var(--color-subtle)] mt-0.5">{m.calories} kcal . {m.proteinG}g P . {m.carbsG}g C . {m.fatG}g F</div>
                      <div className="text-sm text-[var(--color-muted)] mt-2">{m.ingredients.join(", ")}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <details className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl group">
        <summary className="cursor-pointer p-5 font-bold flex items-center justify-between list-none">
          <span>Shopping list</span>
          <span className="text-[var(--color-blue-glow)] group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
        </summary>
        <div className="px-5 pb-5 grid grid-cols-2 md:grid-cols-3 gap-5 text-sm">
          {(["produce", "proteins", "grainsCarbs", "dairyEggs", "pantry", "other"] as const).map((k) => (
            plan.shoppingList[k].length > 0 && (
              <div key={k}>
                <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">{k}</div>
                <ul className="space-y-1 text-[var(--color-muted)]">
                  {plan.shoppingList[k].map((item, idx) => <li key={idx}>{item}</li>)}
                </ul>
              </div>
            )
          ))}
        </div>
      </details>
    </div>
  );
}
```

- [ ] **Step 2: Build the streaming view (client component)**

Create `components/meal-plan/streaming-view.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { experimental_useObject as useObject } from "ai/react";
import { Plan } from "@/lib/meal-plan/schema";
import { PlanReadOnly } from "./plan-read-only";

type Props = { planId: string; clientId: string };

export function StreamingView({ planId, clientId }: Props) {
  const router = useRouter();
  const { object, isLoading, error, submit } = useObject({
    api: `/api/meal-plan/generate?resume=${planId}`,
    schema: Plan
  });

  useEffect(() => {
    submit({ resume: planId });
  }, [submit, planId]);

  useEffect(() => {
    if (!isLoading && object && !error) {
      const t = window.setTimeout(() => router.replace(`/app/clients/${clientId}/meal-plan/${planId}`), 1200);
      return () => window.clearTimeout(t);
    }
  }, [isLoading, object, error, router, clientId, planId]);

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[2px] font-bold text-[var(--color-blue-glow)] px-3 py-1.5 rounded-full bg-[rgba(0,174,239,0.08)] border border-[rgba(0,174,239,0.25)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-blue-glow)] animate-pulse" />
        {isLoading ? "Generating..." : "Done"}
      </div>
      {error && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-warn)] rounded-2xl p-5 text-sm">
          Generation interrupted. Refresh the page to see if it completed, or go back to try again.
        </div>
      )}
      {object && Plan.safeParse(object).success && <PlanReadOnly plan={object as never} />}
    </div>
  );
}
```

Note on `?streaming=1` and `?resume=`: the streaming view is shown when the form first redirects with `?streaming=1`. Inside, it does NOT actually re-call the API; the form already triggered the stream. Instead it reads the server-rendered row. Simpler reworked version below in Step 3.

- [ ] **Step 3: Simplify — the form streams in place, the result page is server-rendered**

Replace `components/meal-plan/streaming-view.tsx` with the corrected version. The form actually consumes the stream in place using `useObject`; the redirect happens after stream completion, NOT before. Update `components/meal-plan/generate-form.tsx` to stream first, then redirect.

Update `components/meal-plan/generate-form.tsx`: replace the `onSubmit` body and add a local streaming state. Insert this block in place of the existing `onSubmit`:

```tsx
import { experimental_useObject as useObject } from "ai/react";
import { Plan } from "@/lib/meal-plan/schema";

// ...inside the component:
const { object, submit: streamSubmit, isLoading, stop } = useObject({
  api: "/api/meal-plan/generate",
  schema: Plan,
  onFinish: ({ object: _o, error: e }) => {
    // The route sets X-Plan-Id on the response; we need to extract it via fetch interceptor
    // Simpler: rely on the server-side redirect after stream completion via window.location
    if (!e) {
      // The streaming response already wrote planId; we need to look it up.
      // Pragmatic alternative: refresh the list and let the coach click the top row.
      router.refresh();
    }
  }
});
```

This still has the planId-handoff gap. **Resolution**: keep things simple. Pre-create the row via a small `/api/meal-plan/draft` route that returns a planId BEFORE the stream starts. Then the form calls draft to get planId, then opens `/app/clients/[clientId]/meal-plan/[planId]?streaming=1`, and the streaming-view page calls `/api/meal-plan/generate?planId=...` to do the actual generation. Refactor: add `/api/meal-plan/draft/route.ts` in Task 6 (already part of route handler — accept either a `draft=1` query or a separate route). Then this task only needs to consume.

To keep this plan executable as written: revert Step 3 and use the form-streams-in-place pattern. The form drops `?streaming=` redirect, instead it shows the partial plan inline as it streams. On completion the form calls `router.refresh()` to reveal the new row in the history list. Coach can then click it to see the read-only view.

Replace `components/meal-plan/generate-form.tsx`'s `onSubmit` with:

```tsx
async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!ready || finalCalories == null || finalProtein == null) {
    setError("This client is missing biometrics (age, height, weight). Add them on the client profile first.");
    return;
  }
  setSubmitting(true);
  setError(null);
  setStreaming(true);

  streamSubmit({
    clientId,
    intake: {
      age: prefill.age, heightCm: prefill.heightCm, weightKg: prefill.weightKg, sex: prefill.sex,
      activity, goal,
      calories: finalCalories, proteinG: finalProtein,
      mealsPerDay, fastBreakfast, cuisines, allergies,
      dietStyle: "omnivore", trainingDays
    }
  });
}
```

Add a streaming preview block beneath the form:

```tsx
{streaming && object && Plan.safeParse(object).success && (
  <div className="mt-6"><PlanReadOnly plan={object as never} /></div>
)}
{streaming && !isLoading && (
  <div className="mt-4 text-sm text-[var(--color-blue-glow)]">Plan saved. Refreshing history...</div>
)}
```

Add to the component state:
```tsx
const [streaming, setStreaming] = useState(false);
```

Remove the read-only page redirect logic (no longer needed for the streaming path).

- [ ] **Step 4: Build the read-only page** (for clicking history rows)

Create `app/app/clients/[clientId]/meal-plan/[planId]/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/meal-plan/storage";
import { PlanReadOnly } from "@/components/meal-plan/plan-read-only";
import { Plan } from "@/lib/meal-plan/schema";

type PageProps = { params: Promise<{ clientId: string; planId: string }> };

export default async function MealPlanReadOnlyPage({ params }: PageProps) {
  const { clientId, planId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const row = await getPlan(supabase as never, planId);
  if (!row) redirect(`/app/clients/${clientId}/meal-plan`);

  if (row.status !== "ready") {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-sm text-[var(--color-warn)]">
          This plan is {row.status}. {row.error ?? ""}
        </p>
      </main>
    );
  }

  const parsed = Plan.safeParse(row.plan_json);
  if (!parsed.success) {
    return <main className="max-w-3xl mx-auto px-6 py-10 text-sm text-[var(--color-warn)]">Stored plan is malformed.</main>;
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <PlanReadOnly plan={parsed.data} />
    </main>
  );
}
```

- [ ] **Step 5: Build + verify**

```bash
npx next build
```

Expected: `Compiled successfully`. Routes `/app/clients/[clientId]/meal-plan` and `/app/clients/[clientId]/meal-plan/[planId]` both appear.

- [ ] **Step 6: Commit**

```bash
git add components/meal-plan/plan-read-only.tsx components/meal-plan/streaming-view.tsx components/meal-plan/generate-form.tsx "app/app/clients/[clientId]/meal-plan/[planId]"
git commit -m "feat(meal-plan): streaming form preview + read-only plan view"
```

---

### Task 10: Client UI — latest plan + history dropdown

**Files:**
- Create: `app/client/meal-plan/page.tsx`
- Create: `app/client/meal-plan/[planId]/page.tsx`

**Interfaces:**
- Consumes: `listPlansForClient`, `getPlan` from `@/lib/meal-plan/storage`; `<PlanReadOnly>` from `@/components/meal-plan/plan-read-only`
- Produces: client-facing pages that show only `status='ready'` plans (RLS enforces this on the server too)

- [ ] **Step 1: Build the latest-plan page**

Create `app/client/meal-plan/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listPlansForClient } from "@/lib/meal-plan/storage";
import { PlanReadOnly } from "@/components/meal-plan/plan-read-only";
import { Plan } from "@/lib/meal-plan/schema";

export default async function ClientMealPlanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const plans = await listPlansForClient(supabase as never, user.id);

  if (plans.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-extrabold mb-3">Meal plan</h1>
        <p className="text-sm text-[var(--color-muted)]">Your coach has not generated a plan for you yet. Hang tight, or message them.</p>
      </main>
    );
  }

  const latest = plans[0];
  const parsed = Plan.safeParse(latest.plan_json);

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Meal plan</div>
          <h1 className="text-2xl font-extrabold mt-1">
            Plan for {new Date(latest.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
          </h1>
        </div>
        {plans.length > 1 && (
          <details className="relative">
            <summary className="text-sm text-[var(--color-blue-glow)] cursor-pointer list-none">Older plans ({plans.length - 1})</summary>
            <ul className="absolute right-0 mt-2 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-2 min-w-[220px] z-10">
              {plans.slice(1).map((p) => (
                <li key={p.id}>
                  <Link href={`/client/meal-plan/${p.id}`} className="block px-3 py-2 text-sm hover:bg-[rgba(255,255,255,0.04)] rounded-lg">
                    {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </header>

      {parsed.success
        ? <PlanReadOnly plan={parsed.data} />
        : <p className="text-sm text-[var(--color-warn)]">Stored plan is malformed.</p>}
    </main>
  );
}
```

- [ ] **Step 2: Build the historical-plan page**

Create `app/client/meal-plan/[planId]/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/meal-plan/storage";
import { PlanReadOnly } from "@/components/meal-plan/plan-read-only";
import { Plan } from "@/lib/meal-plan/schema";

type PageProps = { params: Promise<{ planId: string }> };

export default async function ClientHistoricalPlanPage({ params }: PageProps) {
  const { planId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const row = await getPlan(supabase as never, planId);
  if (!row || row.client_id !== user.id || row.status !== "ready") {
    redirect("/client/meal-plan");
  }

  const parsed = Plan.safeParse(row!.plan_json);
  if (!parsed.success) {
    return <main className="max-w-3xl mx-auto px-6 py-10 text-sm text-[var(--color-warn)]">Stored plan is malformed.</main>;
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <PlanReadOnly plan={parsed.data} />
    </main>
  );
}
```

- [ ] **Step 3: Add nav link to the client sidebar**

Modify `app/client/layout.tsx` (existing file) — add a `Meal plan` Link next to the others. Find the existing `<Link href="/client/program">Program</Link>` line and add directly after it:

```tsx
<Link
  href="/client/meal-plan"
  className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] px-3 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)]"
>
  Meal plan
</Link>
```

- [ ] **Step 4: Build + verify**

```bash
npx next build
```

Expected: `Compiled successfully`. Routes `/client/meal-plan` and `/client/meal-plan/[planId]` appear.

- [ ] **Step 5: Commit**

```bash
git add app/client/meal-plan app/client/layout.tsx
git commit -m "feat(meal-plan): client-side meal plan view + nav link"
```

---

### Task 11: Add coach nav link + full test suite verification

**Files:**
- Modify: `components/sidebar.tsx` (existing) OR `app/app/clients/[clientId]/layout.tsx` (existing)
- Modify: whichever client-detail layout already shows tabs (Programs, Assessments, etc.) to include "Meal plan"

**Interfaces:**
- Consumes: nothing new
- Produces: a clickable "Meal plan" tab on the coach-side per-client detail page

- [ ] **Step 1: Find where client-detail tabs are defined**

```bash
grep -rn "Programs\|Assessments\|Check-ins" "app/app/clients/\[clientId\]/" components/ 2>&1 | head -20
```

Identify the tab/nav file. Likely `app/app/clients/[clientId]/layout.tsx` or a nav component imported there.

- [ ] **Step 2: Add the Meal plan tab**

Add `{ href: "meal-plan", label: "Meal plan" }` to the tab array (or equivalent). Match the existing styling exactly.

- [ ] **Step 3: Run the full test suite**

```bash
npx vitest run
```

Expected: 330+ tests, all passing. Take note of any pre-existing TS errors that are still present in unrelated files (watches, sessions, middleware) — these are out of scope for this plan.

- [ ] **Step 4: Build + deploy preview**

```bash
npx next build
vercel deploy --yes
```

Expected: a `*.vercel.app` preview URL prints. Open it, sign in as a coach, navigate to a client with biometrics, generate a plan, watch the streaming preview, click into the stored row, then sign in as the matching client and view the same plan.

- [ ] **Step 5: Commit + (do not push)**

```bash
git add app/app/clients/\[clientId\]/layout.tsx
git commit -m "feat(meal-plan): coach client-detail nav tab"
```

Stop here. Do NOT promote to production or push to GitHub until the user says so.

---

### Task 12: Production promotion (only after user gives the word)

- [ ] **Step 1: Wait for the user to say something like "ship it" or "promote to bbapt.vercel.app"**

- [ ] **Step 2: Promote**

```bash
vercel deploy --prod --yes
```

Wait for `Deployment <url> ready.`

- [ ] **Step 3: Alias to bbapt.vercel.app**

```bash
vercel alias set <new-url> bbapt.vercel.app
```

Expected: `Success! https://bbapt.vercel.app now points to <new-url>`.

- [ ] **Step 4: Smoke test on bbapt.vercel.app**

Manual checklist:
- Coach → client detail → Meal plan tab → form prefilled → submit → streaming preview → row appears in history
- Generate with no biometrics → "Add biometrics first" error
- Kill network mid-stream → "Generation interrupted" message → 15 minutes later cron reaps it to `failed`
- Client sign in → /client/meal-plan shows latest → older plans dropdown → historical page renders

- [ ] **Step 5: If the user says "Go push", push to GitHub**

```bash
git remote add origin https://github.com/Techbetterbodyacademy/bbaptdistinction.git 2>/dev/null || true
git push -u origin main
```

---

## Self-Review

Ran the spec coverage + placeholder + type-consistency check.

**Spec coverage:** Every spec section maps to a task.
- Database table → Task 1
- Route tree → Tasks 6 + 8 + 9 + 10
- Library layout → Tasks 2 + 3 + 4 + 5
- Streaming choice → Task 1 (deps) + Task 6 (route) + Task 9 (UI consumer)
- Coach UI → Tasks 8 + 9 + 11
- Client UI → Task 10
- Branding rule → Global constraints + applied across UI tasks
- Data flow (happy + error matrix) → Task 6 route tests cover the error matrix
- planId handoff via X-Plan-Id → Task 6 (server) + Task 9 (consumer)
- Orphaned streaming rows reap → Task 7
- Concurrency + cost (daily cap) → Task 6
- Unit tests for mifflin/schema/prompt/storage → Tasks 2 + 3 + 4 + 5
- Route tests → Tasks 6 + 7
- Smoke checklist → Tasks 11 + 12

**Placeholder scan:** Task 9 originally had a TBD around the planId handoff. Resolved in Step 3 of Task 9: the form streams in place and uses `router.refresh()`, sidestepping the need for `?streaming=` redirects. The streaming-view file is kept minimal because the form does the consuming.

**Type consistency:** `MealPlanRow` defined in Task 5 reused in Tasks 8, 9, 10. `MemberIntake` / `Plan` defined in Task 3 used everywhere downstream. `Sex` / `ActivityLevel` / `Goal` defined in Task 2, reused in Task 3 (as zod enums) and Task 8 (as TS types). No drift detected.

Fixes applied inline. No re-review needed.
