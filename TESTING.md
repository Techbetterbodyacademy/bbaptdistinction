# Testing — BBA Coaching App

We use **Vitest** for unit tests and follow strict TDD on all new business logic.

## Commands

```bash
npm test          # run all tests once
npm run test:watch # re-run on file change
```

## The TDD Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Every new function in `lib/` goes through the cycle:
1. **RED** — write the test first. Watch it fail with `Cannot find module` or assertion failure.
2. **GREEN** — write the minimum code to pass.
3. **REFACTOR** — clean up only while tests stay green.

## What we test

We unit-test **pure business logic** in `lib/` — validation, transformation, partition, pricing math, etc. These are framework-agnostic functions that take inputs and return outputs.

Examples in this repo:
- `lib/scheduled-message.ts` — validates and prepares a scheduled message record
- `lib/scheduled-message-batch.ts` — partitions a batch into due / not-yet / skipped

We **do NOT unit-test**:
- Server actions (they redirect — hard to test cleanly without a Next.js test rig)
- Page components (server components — same issue)
- Supabase queries (would require Postgres-in-memory or e2e)

For those layers we rely on:
- TypeScript strict mode catching type errors at build time
- Manual smoke tests against the deployed app
- The pure-logic lib functions being tested means most bugs get caught there

## Pattern for adding a new feature

1. Identify the core decision the feature has to make.
2. Move that decision into a pure function in `lib/<feature>.ts`.
3. Write tests in `lib/<feature>.test.ts` that exercise every branch.
4. Run `npm test` — watch it fail.
5. Write the minimum implementation. Re-run — watch it pass.
6. Build the server action / API route / page using the tested function.

Server-side integration code becomes "wiring" that delegates to tested logic.

## Example: scheduled messaging

The feature: a coach schedules a message to send Monday morning. The cron job fires every 5 minutes, picks pending messages whose `scheduled_for` is past, and converts them to real messages.

Two pure functions captured the entire logic:

- `prepareScheduledMessage(input)` — validates a coach's input, returns `{ ok: true, record }` or `{ ok: false, error }`. Used by the server action.
- `partitionDueScheduledMessages(rows, now)` — partitions a fetched batch into `due`, `notYet`, `skipped`. Used by the cron route.

Both have 100% test coverage. The server action and cron route are thin wrappers that delegate to these. 9 tests, all RED → GREEN.

## Why we don't test Supabase queries

Mocking Supabase doesn't test our queries against real RLS or column types. The real verification is:
1. The SQL patch defines schema + RLS
2. The Supabase service-role REST API confirms columns exist (`scripts/verify-schema.sh`)
3. Smoke-test the deployed app

When tests start to feel like "did I write the SQL right", that's a sign to move that question into a verify-schema script, not a unit test.
