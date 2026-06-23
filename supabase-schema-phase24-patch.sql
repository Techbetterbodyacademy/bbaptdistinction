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
