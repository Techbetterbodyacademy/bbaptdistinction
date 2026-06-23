# Meal Plan Generator inside bbapt — Design Spec

**Date:** 2026-06-24
**Author:** Bryan (with Claude)
**Status:** Approved for implementation
**Phase:** BBA coaching app Phase 3 (per Jase 2026-05-27)

## Purpose

Bring the standalone Meal Plan Generator into bbapt so coaches can generate AI meal plans for their existing members directly inside the coaching app. Reuses the schemas, Mifflin-St Jeor math, and OpenAI prompt logic from `bryansumaitautomate/bba-meal-plan-generator`, but lives inside bbapt with its own data model, auth boundary, and brand. The standalone gold-themed app stays untouched as the public lead-gen funnel.

## Locked decisions

| Decision | Choice | Reason |
|---|---|---|
| Initiator | Coach-only | Coach decides what each client gets; simplest scope; mirrors PT Distinction model |
| Editability | Read-only + Regenerate | AI output is final; regenerate with tweaks if not happy; ships fastest |
| Storage | History of all plans | Every generation saved with timestamp; coach + client can scroll back |
| Macros input | Auto-calc with override | Auto-fill Mifflin-St Jeor from biometrics; coach can override calories + protein before generating |
| Architecture | Approach A (inline port) | Schemas + prompt copied into bbapt/lib; no cross-service coupling; standalone repo stays as the lead funnel |
| Generation UX | Streaming via Vercel AI SDK | `streamObject` with the `Plan` zod schema; progressive rendering; one new dep |

## Architecture

### Database
New table `meal_plan` via Phase 24 SQL patch:

```sql
create table meal_plan (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace(id) on delete cascade,
  client_id uuid not null references user_profile(id) on delete cascade,
  coach_id uuid not null references auth.users(id),
  intake_json jsonb not null,
  plan_json jsonb not null,
  model text not null default 'gpt-4o',
  status text not null default 'ready',
  error text,
  created_at timestamptz not null default now()
);
create index meal_plan_client_idx on meal_plan(client_id, created_at desc);
create index meal_plan_workspace_idx on meal_plan(workspace_id, created_at desc);

alter table meal_plan enable row level security;
```

RLS policies follow the existing workspace-membership pattern used by sibling tables (program, assessment, lifecycle_event). Coach reads/writes for clients in their workspace; client reads own rows only; failed status hidden from client view via the `listPlansForClient` query (`where status = 'ready'`).

### Route tree

| Route | Owner | Purpose |
|---|---|---|
| `POST /api/meal-plan/generate` | server | Validate intake, stream from OpenAI, persist |
| `/app/clients/[clientId]/meal-plan` | coach | Generate form + history list |
| `/app/clients/[clientId]/meal-plan/[planId]` | coach | Read-only plan view |
| `/client/meal-plan` | client | Latest plan + history selector |
| `/client/meal-plan/[planId]` | client | Read-only plan view |

### Library layout

```
lib/meal-plan/
  schema.ts          MemberIntake, Plan, Day, Meal, ShoppingList
  mifflin.ts         computeMacros(age, height, weight, sex, activity, goal)
  prompt.ts          buildSystemPrompt(), buildUserPrompt(intake)
  storage.ts         savePlan, listPlansForClient, listPlansForCoach, getPlan
```

All four files ported from the standalone repo's `lib/schema.ts` and prompt logic, repackaged for bbapt's import conventions.

### Streaming choice

Vercel AI SDK (`ai` + `@ai-sdk/openai`). The server route uses `streamObject` with the `Plan` zod schema. The client uses the `useObject` hook to consume the partial typed object. This validates partial output against zod as it streams, avoiding manual JSON token-parsing.

## Components

### Coach side

**`MealPlanGenerateForm` (client component)**
At `/app/clients/[clientId]/meal-plan`. Prefilled from `user_profile.age`, `height_cm`, `current_weight_kg`, `sex`. Shows the Mifflin-St Jeor auto-calc result in a badge, with override inputs for calories and protein. Other fields: goal (cut/maintain/gain), meals per day (3-6), fasting breakfast toggle, cuisines (multi-select among five), allergies (free text), diet style. Submit opens the streaming view.

**`MealPlanStreamingView` (client component)**
Consumes the stream via `useObject`. Renders a skeleton (7 day cards, coach note section, shopping list section). As the partial `Plan` fills in, matching cards animate in using the existing `ScrollReveal` component. A "Generating..." pill stays visible until the stream completes, then turns into a "Done" check. On completion, redirects to the read-only view.

**`MealPlanHistoryList` (server component)**
Lists past plans for this client, newest first. Each row: created_at, calories, protein, goal, "View" link. Includes failed plans behind a toggle ("Show failed (N)").

### Client side

**`ClientPlanView` (server component)**
At `/client/meal-plan`. Loads the latest plan with `status='ready'` for the logged-in client. Renders the read-only plan layout. "Older plans" dropdown selector shows history with dates.

**`ClientPlanReadOnly` (shared component)**
7-day tab layout with Mon/Tue/Wed/.../Sun pills. Each day: meal cards with macros and ingredient list. Coach note pinned at the top. Shopping list in a collapsible drawer at the bottom.

### Branding

Blue/black/white/gray only (per BBA coaching app rule). Inter for body text, Instrument Serif for accent numerals on day tabs (matches the landing page treatment). Uses `var(--color-blue-glow)` for the "Generating" pill and active day tab. No gold, no pink.

## Data flow

### Happy path
1. Coach fills form, submits
2. `POST /api/meal-plan/generate` with intake JSON
3. Server: auth check, workspace ownership check, `MemberIntake.parse`
4. Server: INSERT `meal_plan` row with `status='streaming'`, empty `plan_json`, returns planId
5. Server: `streamObject({ schema: Plan, ... })` emits partial Plan objects
6. Client: `useObject` hook progressively renders the skeleton and fills cards
7. Stream completes; server writes final `plan_json`, sets `status='ready'`
8. Client redirects to `/app/clients/[clientId]/meal-plan/[planId]`

### Error matrix
| Failure | When | Server response | User experience |
|---|---|---|---|
| Bad JSON body | Pre-parse | 400 | Form error: "Invalid request" |
| `MemberIntake` validation fails | Pre-stream | 400 + zod errors | Inline field errors on the form |
| Coach not in client's workspace | Pre-stream | 403 | "You don't have access to this client" |
| No biometrics on client profile | Pre-stream | 422 + `code: 'NEEDS_BIOMETRICS'` | "Add age/height/weight to this client first" with link to client profile |
| OpenAI rate limit / timeout | Mid-stream | Stream ends early | Toast: "Generation interrupted. Try again." Row marked `status='failed'` |
| OpenAI returns invalid JSON | Mid-stream | `streamObject` throws | Same toast. Row marked `status='failed'` with error column populated |
| Network drop on client | Mid-stream | N/A | Toast: "Connection lost. Refresh to see if it completed." Server keeps writing |
| Supabase write fails post-stream | Post-stream | Logged | Toast: "Generation done but saving failed" |

### Concurrency + cost
- Submit button disabled while a stream is in flight (prevents double-generation)
- No server-side lock; concurrent requests both succeed (history handles it)
- One env var `MEAL_PLAN_MAX_PER_DAY_PER_WORKSPACE` (default 50). Pre-stream count check returns 429 with "Daily limit reached. Contact support to raise it."

### planId handoff
The server creates the `meal_plan` row before the stream starts and returns its id via the `X-Plan-Id` response header. The client reads this header before consuming the body, so it knows where to redirect on completion. The `streamObject` body itself contains only the partial Plan, not the row id.

### Orphaned streaming rows
If the server process dies mid-stream (Vercel function timeout, crash), a row may be stuck in `status='streaming'` indefinitely. A nightly Vercel cron (`/api/cron/reap-meal-plans`) flips any `streaming` row older than 10 minutes to `status='failed'` with `error='orphaned_stream'`. This reuses the existing Vercel cron setup.

## Testing strategy

### Unit tests (TDD, RED before GREEN)

**`lib/meal-plan/mifflin.test.ts`**
- BMR for known reference (40yo male, 180cm, 90kg)
- Activity multipliers (sedentary 1.2, light 1.375, moderate 1.55, active 1.725, athlete 1.9)
- Goal adjustment (cut -500, maintain 0, gain +400)
- Protein g/kg (cut 2.0, maintain 1.6, gain 1.8)
- Clamps (1200-5000 cal, 50-400g protein)
- Missing sex defaults to neutral 1,750 base

**`lib/meal-plan/schema.test.ts`**
- `MemberIntake.safeParse` round-trip
- Plan schema rejects malformed AI output (missing days, negative macros, empty shopping list)
- 7-day requirement enforced
- Five cuisines + three goals + activity levels validated

**`lib/meal-plan/prompt.test.ts`**
- `buildSystemPrompt()` includes Jase voice anchor
- `buildUserPrompt(intake)` interpolates every intake field
- Allergies render as a constraint
- Cuisines listed when present, omitted when none
- Snapshot test for a fixed intake (catches accidental prompt changes)

**`lib/meal-plan/storage.test.ts`**
- `savePlan` returns inserted id
- `listPlansForClient` filters `status='ready'`
- `listPlansForCoach` includes failed when `includeFailed=true`
- RLS errors bubble with a clear message

### Route tests
**`app/api/meal-plan/generate/route.test.ts`**
- Invalid JSON → 400
- Invalid intake → 400 + zod errors
- Unauthenticated → 401
- Coach in wrong workspace → 403
- Missing biometrics → 422 + `code: 'NEEDS_BIOMETRICS'`
- Daily cap exceeded → 429
- Happy path → 200 streaming, row `status='ready'` at end (mocked OpenAI returns canned Plan JSON)
- OpenAI throws mid-stream → row `status='failed'`, error column populated

### Component tests
Skipping React Testing Library on streaming view. Logic is thin and best verified manually.

### Manual smoke checklist
- Generate with full biometrics → stream completes → redirect works
- Override calories before submit → final plan shows override
- Submit with no biometrics → "Add biometrics first" error
- Kill network mid-stream → "Connection lost" toast → refresh → plan exists
- Cross-workspace access → 403

### Coverage target
From 284 tests to ~330. Per WAT framework rule: every new lib function gets a test before implementation.

## Out of scope (deferred)

- Editing individual fields after generation
- Client-side generation
- PDF export (Path B from `docs/integrations/ghl.md`)
- Streaming meal-by-meal regeneration of a single day
- Shopping list export to grocery apps
- Macro visualization charts
- Localization / metric-imperial unit toggle (assumes metric)

## Environment variables

| Var | Where | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | Vercel | Already set for assistant routes |
| `MEAL_PLAN_MAX_PER_DAY_PER_WORKSPACE` | Vercel | Default 50; cost guard |

## Open questions resolved during brainstorming

| Question | Answer |
|---|---|
| Who initiates? | Coach-only |
| Editing model? | Read-only + Regenerate |
| Storage model? | History of all plans |
| Macros input? | Auto-calc with override |
| Approach? | Inline port + streaming (Vercel AI SDK) |
| Standalone repo fate? | Stays as public lead funnel, untouched |
| Streaming library? | Vercel AI SDK `streamObject` with `Plan` zod schema |
