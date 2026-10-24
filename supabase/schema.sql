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

-- Daily usage counters for abuse protection (src/lib/usage.ts). One row per
-- (UTC day, scope): 'global:ai' for the whole site, 'sessions:user:<id>' or
-- 'sessions:ip:<ip>' for new interview sessions. RLS is on with no policies,
-- so only the service-role key (server only) can read or write it.
create table if not exists public.usage_counters (
  day date not null,
  scope text not null,
  count int not null default 0,
  primary key (day, scope)
);

alter table public.usage_counters enable row level security;

-- Atomically adds one to today's counter for p_scope and returns true, or
-- returns false without changing anything if it is already at p_limit. Callable
-- by the service role only: if the browser could call it, anyone could burn
-- through the global cap.
create or replace function public.bump_usage(p_scope text, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v int;
begin
  insert into public.usage_counters as u (day, scope, count)
  values ((now() at time zone 'utc')::date, p_scope, 1)
  on conflict (day, scope) do update set count = u.count + 1
    where u.count < p_limit
  returning u.count into v;

  if v = 1 then
    delete from public.usage_counters where day < (now() at time zone 'utc')::date - 7;
  end if;

  return v is not null;
end;
$$;

revoke all on function public.bump_usage(text, int) from public, anon, authenticated;
grant execute on function public.bump_usage(text, int) to service_role;

-- The old paid flow created public.session_credits. Nothing uses it any more.
-- It is harmless to leave; to remove it, run:
--   drop table if exists public.session_credits;
