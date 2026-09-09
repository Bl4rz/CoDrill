-- Run this once in the Supabase dashboard: SQL Editor -> New Query -> paste -> Run.
-- Safe to re-run in full any time this file changes -- every statement is
-- either idempotent (IF NOT EXISTS) or preceded by a DROP POLICY IF EXISTS,
-- since CREATE POLICY (unlike CREATE TABLE) has no IF NOT EXISTS of its own
-- and errors on a second run otherwise.
--
-- Stores interview sessions for signed-in users, mirroring the local StoredSession
-- shape as JSONB rather than a fully normalized schema -- simplest thing that
-- works, since sessions are only ever read/written as a whole by their owner.

create table if not exists public.interview_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_posting_text text not null,
  role_summary jsonb not null,
  questions jsonb not null,
  attempts jsonb not null default '{}'::jsonb,
  current_question_index int not null default 0,
  report jsonb,
  created_at timestamptz not null default now()
);

alter table public.interview_sessions enable row level security;

drop policy if exists "select own sessions" on public.interview_sessions;
create policy "select own sessions" on public.interview_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "insert own sessions" on public.interview_sessions;
create policy "insert own sessions" on public.interview_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own sessions" on public.interview_sessions;
create policy "update own sessions" on public.interview_sessions
  for update using (auth.uid() = user_id);

drop policy if exists "delete own sessions" on public.interview_sessions;
create policy "delete own sessions" on public.interview_sessions
  for delete using (auth.uid() = user_id);

create index if not exists interview_sessions_user_id_idx
  on public.interview_sessions(user_id);

-- One row per paid Stripe Checkout session, created by the webhook
-- (/api/billing/webhook) once payment is confirmed -- never by the client
-- directly, which is why there's no insert policy below. A credit is
-- "available" while consumed_at is null; /api/generate-questions atomically
-- claims one (UPDATE ... WHERE consumed_at IS NULL ... RETURNING) the same
-- request it's needed in, so there's no window between "check" and "use"
-- for a race to slip through. Primary key is the Stripe checkout session id
-- itself, which makes the webhook's insert naturally idempotent if Stripe
-- ever redelivers the same event.
create table if not exists public.session_credits (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.session_credits enable row level security;

drop policy if exists "select own credits" on public.session_credits;
create policy "select own credits" on public.session_credits
  for select using (auth.uid() = user_id);

drop policy if exists "consume own credits" on public.session_credits;
create policy "consume own credits" on public.session_credits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists session_credits_user_id_idx
  on public.session_credits(user_id);
