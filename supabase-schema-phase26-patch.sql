-- Phase 26: add Slack-style reply support to messages.
-- Each message can optionally reference another message it's replying to.
-- Idempotent: safe to re-run.

alter table message
  add column if not exists reply_to_id uuid references message(id) on delete set null;

create index if not exists idx_message_reply_to on message(reply_to_id) where reply_to_id is not null;
