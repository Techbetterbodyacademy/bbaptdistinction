# BBA Coaching · App

The coaching platform Better Body Academy uses to run its programs. Built to replace PT Distinction with full data ownership, BBA branding, and features tailored to BBA's actual workflow.

**Live:** https://bbapt.vercel.app
**Stack:** Next.js 16 App Router · React 19 · TypeScript strict · Supabase (Postgres + Auth + Storage) · Tailwind v4 · Vercel
**Tests:** 215 passing · strict TDD on all `lib/` business logic

---

## What's built

### Auth
| Flow | URL | Notes |
|---|---|---|
| Marketing landing | `/` | BBA-branded conversion page for prospective clients |
| Sign in | `/login` | Email/password (direct) OR Google OAuth (with email 2FA) |
| Sign up | `/signup` | Email/password OR Google OAuth, sends welcome email via Resend |
| Forgot password | `/forgot-password` | 6-digit OTP via Resend → set new password → auto sign-in |
| Passwordless login | `/login/otp` | Backup OTP-only sign-in for users who don't have a password |
| 2FA gate | `/login/2fa` | Enforced after Google sign-in only, code sent via Resend |
| Sign-in settings | `/app/settings/account` | Set/change password (e.g. Google signups adding a password) |

**Email provider:** Resend (custom send via our `lib/resend.ts`, NOT Supabase's SMTP). Supabase email confirmation is OFF — we send welcome + OTP emails ourselves so Supabase's broken default SMTP never blocks us. **Until a custom domain is verified in Resend**, emails only deliver to the Resend account owner's address.

### Coach app (`/app/*`)
Sidebar nav:
- **Dashboard** — stats, "needs your attention", recent activity feed
- **Business health** (`/app/watches`) — The 4 Jase Watches (churn / retention / renewal / offboarding), at-risk clients table, upcoming intervention calls
- **Calendar** — 7-day grid of workout sessions
- **Clients** — list, profile, stage selector, intervention scheduler
- **Groups** — cohort coaching
- **Check-ins** — weekly client check-ins + coach replies
- **Messages** — direct messaging (one thread per client, real-time DB triggers bump `last_message_at`)
- **Community** — workspace-wide feed with likes + comments
- **AI Assistant** — chat that sees a snapshot of clients/programs/activity
- **Workflows** — if-then automation (trigger → action template)
- **Packages** — Stripe Checkout for selling coaching packages
- **Mini site** — public coach landing page at `/c/[slug]`
- **Library** dropdown:
  - Programs (manual builder + AI generator + PTD import)
  - Exercises
  - Assessment templates
  - Results tracking (custom metrics)
  - Forms & Questionnaires (public intake forms at `/f/[id]`)
  - Coaching content (resources)
  - Habits library
- **Team access** (`/app/team`) — invite trainers, see workload at `/app/team/workload`
- **Sign-in settings** (`/app/settings/account`)
- **Workspace settings** (`/app/settings/workspace`)

### Client portal (`/client/*`)
- Program view (current week's workouts)
- Workout logger (sets/reps/RPE with exercise history)
- Logbook (transformation entries: weight, body fat, photos)
- Check-ins (weekly submission to coach)
- Library (assigned content/resources)
- Habits (daily check-off)
- Messages (their thread with their coach)

### Public surfaces
- `/` — Marketing landing
- `/buy/[slug]` — Public package purchase (Stripe Checkout)
- `/f/[id]` — Public intake form submission
- `/c/[slug]` — Public coach mini-site
- `/manifest.webmanifest` + `/sw.js` — Installable PWA (BBA-branded)

---

## The 4 Jase Watches

The four KPIs Jase tracks on the BBA client-data dashboard. Now computed natively from `client_profile.lifecycle_stage` and shown at `/app/watches`:

- **Churn rate** — `% offboarded of total`
- **Retention rate** — `% non-offboarded of total`
- **Renewal rate** — `% renewed of past-onboarding`
- **Offboarding count** — total clients lost

### Lifecycle stages
Each client moves through these stages (matching the BBA spreadsheet vocabulary):
`onboarding → kickoff → momentum → celebration / challenge_upgrade → catchup_call / retreat → renewed / offboarded`

Coaches set the stage via pill buttons on the client profile. Stage moves are timestamped (`stage_entered_at`, `renewed_at`, `offboarded_at`).

### At-risk detection
`lib/at-risk.ts` scores each active client based on:
- Days since last check-in (7+ → +30, 14+ → +50)
- Workouts in last 7 days vs expected (0/3 → +30, partial → +15)
- Days since last client message (14+ → +20)
- Onboarding stage gets a 60% softener; offboarded short-circuits to 0

Top 12 at-risk clients show on `/app/watches` with their specific reasons + a quick link to schedule a Catchup call.

### Intervention loop
1. Coach sees an at-risk client on the Business health page
2. Opens client profile → "Schedule an intervention" → picks Catchup call / Retreat / Kickoff call / Celebration call / Strategy call
3. Form auto-moves the client into the matching lifecycle stage (configurable per submission)
4. Upcoming intervention shows on `/app/watches` grouped into Today / This week
5. Post-call: coach hits "Mark done" with an outcome note; the event becomes a history entry

---

## Setup

### 1. Supabase project
1. Create a Supabase project: https://supabase.com/dashboard
2. Save the URL, `anon` public key, and `service_role` key
3. Run the schema patches in order (see Schema section below)

### 2. Env vars (Vercel + local `.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...          # AI Program Generator, AI Assistant, PTD import
RESEND_API_KEY=...           # Welcome + OTP + 2FA emails
RESEND_FROM=Better Body Academy <noreply@mail.betterbodyacademy.com>  # optional, defaults to resend.dev sender
STRIPE_SECRET_KEY=...        # Public buy pages
CRON_SECRET=...              # Vercel Cron auth header
NEXT_PUBLIC_SITE_URL=https://bbapt.vercel.app
```

### 3. Supabase Auth providers
- **Email**: turn OFF "Confirm email" (we send our own welcome via Resend)
- **Google**: enable, paste Client ID + Secret from Google Cloud Console
  - Authorized redirect URI: `https://<your-supabase-ref>.supabase.co/auth/v1/callback`

### 4. Stripe (only needed if selling packages)
- Add `STRIPE_SECRET_KEY` to Vercel env
- Configure webhook in Stripe pointing to `https://bbapt.vercel.app/api/stripe/webhook` for `checkout.session.completed`

### 5. Install + run
```bash
npm install
npm run dev        # localhost:3000
npm test           # vitest, 215 tests
npm run build      # production build check
```

---

## Schema phases

All patches are idempotent (`create table if not exists`, `drop policy if exists`). Run in order. The bundle file `supabase-schema-phase8-19-bundle.sql` covers phases 8-19 in a single paste.

| Phase | File | Adds |
|---|---|---|
| Base | `supabase-schema.sql` | Workspace, user_profile, client_profile, program, workout, workout_exercise, exercise, intake_response, check_in, transformation_entry, workout_session, etc. |
| 1 | `phase1-patch.sql` | Owner-based RLS |
| 2 | `phase2-patch.sql` | Client invites + intake RLS |
| 3 | `phase3-patch.sql` | Program builder RLS + workout slot uniqueness |
| 4 | `phase4-patch.sql` | Workout logging (workout_session, set_log) |
| 5 | `phase5-patch.sql` | Check-ins + reminder cron tracking |
| 6 | `phase6-patch.sql` | Post generator + resources |
| 7 | `phase7-patch.sql` | Habits, coach_note, client_file, client-files storage bucket |
| 8 | `phase8-patch.sql` | Direct messaging (message_thread, message) + auto-create triggers |
| 9 | `phase9-patch.sql` | Scheduled messages |
| 10 | `phase10-patch.sql` | Groups (client_group, client_group_member) |
| 11 | `phase11-patch.sql` | Per-client Assessments |
| 12 | `phase12-patch.sql` | Workflows (if-then automation) |
| 13 | `phase13-patch.sql` | Coaching packages + Stripe checkout sessions |
| 14 | `phase14-patch.sql` | Forms & Questionnaires |
| 15 | `phase15-patch.sql` | Results tracking (tracked_metric, client_measurement) |
| 16 | `phase16-patch.sql` | Trainer access (workspace_trainer, multi-coach with roles) |
| 17 | `phase17-patch.sql` | Mini site (public coach landing) |
| 18 | `phase18-patch.sql` | Assessment templates library |
| 19 | `phase19-patch.sql` | Community feed (community_post, community_comment, community_like) |
| 20 | `phase20-patch.sql` | Email OTP (custom 2FA + password reset via Resend) |
| 21 | `phase21-patch.sql` | Client lifecycle stages (`lifecycle_stage`, `stage_entered_at`, `renewed_at`, `offboarded_at`) + KPI view |
| 22 | `phase22-patch.sql` | Lifecycle events (catchup_call, retreat, kickoff_call, celebration_call, strategy_call) |
| 23 | `phase23-patch.sql` | Fix `client_invite` RLS to use `auth.jwt()` instead of `auth.users` (resolves 42501 "permission denied for table users" on insert) |

---

## Testing

```bash
npm test            # run once
npm run test:watch  # re-run on change
```

**Strict TDD on all `lib/` modules.** Every pure-logic file has a `.test.ts` next to it. 215 tests as of phase 22. New features add their tests to the same file pattern. Server actions are integration code (Supabase + Resend); they trust the tested helpers and aren't unit-tested.

Test coverage by feature:
- `email-otp` · `reset-email` · `welcome-email` — auth email flows
- `password-change` — set/change password validation
- `jase-watches` — KPI computation (includes a fixture reproducing Jase's actual 3,358 / 42.1% / 2.9% numbers)
- `at-risk` — churn-risk scoring
- `coach-workload` — per-coach load aggregation
- `lifecycle-event` — intervention scheduling + partitioning
- `client-csv` — bulk CSV parser + per-row validation for the importer
- `workspace-slug` — slugify workspace name + collision-retry with UUID fallback
- `coach-reassign` — validates which coaches a client can be assigned to (owner or accepted trainer)
- `scheduled-message` · `scheduled-message-batch` — Phase 9 messaging
- `program-gen` · `ptd-import` — AI prompt builders + response parser
- `forms` · `assessment` · `assessment-template` · `results` — content builders
- `groups` · `workflows` · `community` · `trainer-access` · `packages` — feature-specific logic
- `pwa` · `mini-site` · `assistant` · `ai` — infra helpers

---

## Deployment

Production: https://bbapt.vercel.app (Vercel)

```bash
vercel deploy --prod --yes
vercel alias set <deploy-url> bbapt.vercel.app   # if needed
```

After each deploy:
- Cron jobs: `vercel.json` defines `/api/cron/checkin-reminders` (daily 14:00 UTC) and `/api/cron/flush-scheduled-messages` (daily 14:15 UTC). Hobby tier caps at once-per-day; Pro unlocks finer schedules.
- Service worker auto-updates on first request after deploy.

---

## PTD migration

The blocker for full launch is porting BBA's 90 PT Distinction programs into the new app. Three paths, in order of effort:

1. **Paste-text importer** (`/app/programs/import-ptd`) — coach copies PTD program structure as text, GPT-4.1 parses it into our schema, app inserts program + workouts + exercises. Bypasses PTD's lack of an export API.
2. **AI Program Generator** (`/app/programs/new-ai`) — describe a program in plain text, AI builds one from scratch. Better for fresh programs than ports.
3. **Manual builder** (`/app/programs/new`) — week-by-week form, slowest but most controlled.

For 90 programs: option 1 is realistic at ~3-5 min per program.

---

## Common operations

| Task | Where |
|---|---|
| Reset a forgotten password | `/forgot-password` |
| Disable a coach's access | `/app/team` → Remove |
| Move a client through the funnel | Client profile → Lifecycle stage pills |
| Find at-risk clients today | `/app/watches` → "Needs intervention" |
| Schedule a Catchup call | Client profile → "Schedule an intervention" |
| See who's carrying the most clients | `/app/team/workload` |
| Migrate a PT Distinction program | `/app/programs/import-ptd` |
| Bulk-import clients from a spreadsheet | `/app/clients/import` (paste CSV) |
| View the public buy page | `/buy/[your-workspace-slug]` |
| View the public mini-site | `/c/[your-workspace-slug]` |
| Build an intake form | `/app/forms` |

---

## Conventions

- **Brand**: blue (#00AEEF) / black / white / gray ONLY. No pink, no other accents.
- **No em-dashes** anywhere (copy or code comments). Use periods, commas, colons.
- **Tone**: direct, plainspoken, slightly Aussie.
- **Idempotent SQL**: every schema patch is safe to re-run.
- **Server actions** for mutations; no client-side fetch except for service worker.
- **Cookie-based auth** via `@supabase/ssr`. Middleware refreshes the session on every request.

---

## Outstanding items

- **PTD program migration** — importer is live at `/app/programs/import-ptd`, 90 programs still need to be pasted in
- **Resend domain verification** — `mail.betterbodyacademy.com` DNS records needed; until verified, emails only deliver to the Resend account owner. After DNS is added in Resend, set `RESEND_FROM=Better Body Academy <noreply@mail.betterbodyacademy.com>` in Vercel env and redeploy.
- **Billing** — marked "SOON" in sidebar; Stripe + checkout_session table exist, surface UI not built
- **Client data import** — importer live at `/app/clients/import` (paste CSV with `full_name,email,age,height_cm,current_weight_kg,lifecycle_stage`). Skips duplicates by email. Use this for the 1,877 RAW rows in the BBA spreadsheet.

See `/2026-06-15-Jase-Bryan.md` for the full priority discussion.
