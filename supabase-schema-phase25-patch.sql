-- Phase 25: add sex column to client_profile for the meal plan generator's
-- Mifflin-St Jeor macro calculator. Falls back to 'neutral' when unset.
-- Idempotent: safe to re-run.

alter table client_profile
  add column if not exists sex text
  check (sex in ('male', 'female', 'neutral'));
