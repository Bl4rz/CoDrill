-- Milestone 1: player progression (XP, levels, coins, daily quests, achievements).
--
-- How to run: Supabase dashboard -> SQL Editor -> New query -> paste this whole
-- file -> Run. It is safe to run more than once (every statement is idempotent).
-- How to undo: run supabase/rollback/20261024000000_player_progression.down.sql
-- (it deletes everything this file creates, including all XP data).
--
-- Security model:
--   * Every table has row-level security on. Signed-in users may SELECT only their
--     own rows. There is NO insert/update/delete policy, and the privileges are
--     revoked too, so the browser can never write XP, coins, levels or results.
--   * All writes go through the SECURITY DEFINER functions below. They are
--     executable by service_role only (the server's key), never anon/authenticated.
--   * Awards are transactional and idempotent: the ledger row and the totals change
--     in one transaction, and UNIQUE (user_id, source_type, source_id) means one
--     source can never pay twice, however many times it is retried.

-- ---------------------------------------------------------------- level curve
-- Mirrors src/lib/progression/config.ts (LEVEL). A test keeps the two in sync.
create or replace function public.level_for_xp(p_xp int)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  lvl int := 1;
  remaining int := greatest(coalesce(p_xp, 0), 0);
  need int;
begin
  loop
    exit when lvl >= 50;
    need := 100 + 25 * (lvl - 1);
    exit when remaining < need;
    remaining := remaining - need;
    lvl := lvl + 1;
  end loop;
  return lvl;
end;
$$;

-- --------------------------------------------------------------------- types
do $$
begin
  if not exists (select 1 from pg_type where typname = 'progression_reason' and typnamespace = 'public'::regnamespace) then
    create type public.progression_reason as enum ('question_completed', 'quest_claimed');
  end if;
end
$$;

-- -------------------------------------------------------------------- tables
create table if not exists public.player_progression (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp int not null default 0 check (total_xp >= 0),
  level int not null default 1 check (level >= 1),
  coins int not null default 0 check (coins >= 0),
  timezone text not null default 'UTC',
  timezone_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount int not null check (amount > 0),
  reason public.progression_reason not null,
  source_type text not null,
  source_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_id)
);

create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount int not null check (amount > 0),
  reason public.progression_reason not null,
  source_type text not null,
  source_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_id)
);

-- The server records every run it generates and every question in it. A result
-- can only be stored for a question the server issued to that user.
create table if not exists public.issued_runs (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_title text not null,
  seniority text not null,
  posting_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.issued_questions (
  question_id uuid primary key,
  session_id uuid not null references public.issued_runs(session_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  topic text not null,
  order_index int not null
);

-- One stored result per question, ever (first write wins).
create table if not exists public.question_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  question_id uuid not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  topic text not null,
  language text not null check (language in ('javascript', 'python', 'java')),
  correctness int not null check (correctness between 0 and 100),
  communication int not null check (communication between 0 and 100),
  reasoning int not null check (reasoning between 0 and 100),
  xp_awarded int not null default 0,
  coins_awarded int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create table if not exists public.player_quests (
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id text not null,
  day date not null,
  target int not null check (target > 0),
  progress int not null default 0 check (progress >= 0),
  completed_at timestamptz,
  claimed_at timestamptz,
  primary key (user_id, quest_id, day)
);

create table if not exists public.achievements (
  id text primary key,
  name text not null,
  description text not null,
  sort_order int not null default 0
);

create table if not exists public.player_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.achievements(id),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create index if not exists issued_runs_user_created_idx on public.issued_runs (user_id, created_at desc);
create index if not exists issued_questions_session_idx on public.issued_questions (session_id);
create index if not exists question_results_user_created_idx on public.question_results (user_id, created_at desc);
create index if not exists question_results_session_idx on public.question_results (session_id);
create index if not exists player_quests_user_day_idx on public.player_quests (user_id, day);

-- The same six ids as ACHIEVEMENTS in src/lib/progression/config.ts.
insert into public.achievements (id, name, description, sort_order) values
  ('first_run', 'First Run', 'Finish your first question.', 1),
  ('three_down', 'Three Down', 'Finish 3 questions.', 2),
  ('clean_explainer', 'Clean Explainer', 'Score 80+ in Communication on a question.', 3),
  ('speed_thinker', 'Speed Thinker', 'Score 80+ in Reasoning on a question.', 4),
  ('polyglot', 'Polyglot', 'Finish questions in 2 different languages.', 5),
  ('level_5', 'Level 5', 'Reach level 5.', 6)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

-- The ledgers are append-only: a row can be inserted, never changed. (Rows only
-- disappear if the whole account is deleted, via the foreign key cascade.)
create or replace function public.reject_ledger_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'ledger rows are append-only' using errcode = '42501';
end;
$$;

drop trigger if exists xp_transactions_no_update on public.xp_transactions;
create trigger xp_transactions_no_update before update on public.xp_transactions
  for each row execute function public.reject_ledger_update();

drop trigger if exists coin_transactions_no_update on public.coin_transactions;
create trigger coin_transactions_no_update before update on public.coin_transactions
  for each row execute function public.reject_ledger_update();

-- ----------------------------------------------------------------------- RLS
alter table public.player_progression enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.issued_runs enable row level security;
alter table public.issued_questions enable row level security;
alter table public.question_results enable row level security;
alter table public.player_quests enable row level security;
alter table public.achievements enable row level security;
alter table public.player_achievements enable row level security;

drop policy if exists "read own progression" on public.player_progression;
create policy "read own progression" on public.player_progression
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "read own xp" on public.xp_transactions;
create policy "read own xp" on public.xp_transactions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "read own coins" on public.coin_transactions;
create policy "read own coins" on public.coin_transactions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "read own runs" on public.issued_runs;
create policy "read own runs" on public.issued_runs
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "read own issued questions" on public.issued_questions;
create policy "read own issued questions" on public.issued_questions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "read own results" on public.question_results;
create policy "read own results" on public.question_results
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "read own quests" on public.player_quests;
create policy "read own quests" on public.player_quests
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "read achievement list" on public.achievements;
create policy "read achievement list" on public.achievements
  for select to anon, authenticated using (true);

drop policy if exists "read own achievements" on public.player_achievements;
create policy "read own achievements" on public.player_achievements
  for select to authenticated using (auth.uid() = user_id);

-- Defense in depth: even without a write policy, take the privileges away.
revoke all on public.player_progression, public.xp_transactions, public.coin_transactions,
  public.issued_runs, public.issued_questions, public.question_results, public.player_quests,
  public.achievements, public.player_achievements from anon, authenticated;
grant select on public.player_progression, public.xp_transactions, public.coin_transactions,
  public.issued_runs, public.issued_questions, public.question_results, public.player_quests,
  public.player_achievements to authenticated;
grant select on public.achievements to anon, authenticated;

-- ------------------------------------------------------------------ functions
create or replace function public.ensure_player(p_user uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.player_progression (user_id) values (p_user) on conflict (user_id) do nothing;
$$;

-- The only way XP and coins ever change. Locks the player's row so concurrent
-- grants queue up, then inserts the ledger rows and updates the totals together.
create or replace function public.grant_rewards(
  p_user uuid,
  p_xp int,
  p_coins int,
  p_reason public.progression_reason,
  p_source_type text,
  p_source_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cur public.player_progression%rowtype;
  tx_id uuid;
  new_xp int;
  new_coins int;
  new_level int;
begin
  if p_xp < 1 or p_xp > 200 then
    raise exception 'invalid xp amount' using errcode = '22023';
  end if;
  if p_coins < 0 or p_coins > 100 then
    raise exception 'invalid coin amount' using errcode = '22023';
  end if;

  perform public.ensure_player(p_user);
  select * into cur from public.player_progression where user_id = p_user for update;

  insert into public.xp_transactions (user_id, amount, reason, source_type, source_id)
  values (p_user, p_xp, p_reason, p_source_type, p_source_id)
  on conflict (user_id, source_type, source_id) do nothing
  returning id into tx_id;

  if tx_id is null then
    return jsonb_build_object(
      'granted', false, 'xp_gained', 0, 'coins_gained', 0,
      'total_xp', cur.total_xp, 'level', cur.level, 'previous_level', cur.level, 'coins', cur.coins
    );
  end if;

  if p_coins > 0 then
    insert into public.coin_transactions (user_id, amount, reason, source_type, source_id)
    values (p_user, p_coins, p_reason, p_source_type, p_source_id)
    on conflict (user_id, source_type, source_id) do nothing;
  end if;

  new_xp := cur.total_xp + p_xp;
  new_coins := cur.coins + p_coins;
  new_level := public.level_for_xp(new_xp);

  update public.player_progression
     set total_xp = new_xp, coins = new_coins, level = new_level, updated_at = now()
   where user_id = p_user;

  return jsonb_build_object(
    'granted', true, 'xp_gained', p_xp, 'coins_gained', p_coins,
    'total_xp', new_xp, 'level', new_level, 'previous_level', cur.level, 'coins', new_coins
  );
end;
$$;

-- Called when a signed-in user is given a new set of questions.
create or replace function public.issue_run(
  p_user uuid,
  p_session_id uuid,
  p_role_title text,
  p_seniority text,
  p_posting_hash text,
  p_questions jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) > 12 then
    raise exception 'invalid questions' using errcode = '22023';
  end if;

  insert into public.issued_runs (session_id, user_id, role_title, seniority, posting_hash)
  values (p_session_id, p_user, left(p_role_title, 200), left(p_seniority, 100), left(p_posting_hash, 100))
  on conflict (session_id) do nothing;

  insert into public.issued_questions (question_id, session_id, user_id, difficulty, topic, order_index)
  select x.question_id, p_session_id, p_user, x.difficulty, left(x.topic, 200), x.order_index
    from jsonb_to_recordset(p_questions) as x(question_id uuid, difficulty text, topic text, order_index int)
   where exists (select 1 from public.issued_runs r where r.session_id = p_session_id and r.user_id = p_user)
  on conflict (question_id) do nothing;
end;
$$;

-- What the server needs to price a result: the issued difficulty and whether this
-- posting was already run (and at least partly finished) before.
create or replace function public.get_question_context(p_user uuid, p_session_id uuid, p_question_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.issued_questions%rowtype;
  run public.issued_runs%rowtype;
  prior int;
  done boolean;
begin
  select * into q from public.issued_questions
   where question_id = p_question_id and session_id = p_session_id and user_id = p_user;
  if not found then
    raise exception 'question_not_issued' using errcode = 'P0002';
  end if;
  select * into run from public.issued_runs where session_id = p_session_id;

  select count(*) into prior
    from public.issued_runs r2
   where r2.user_id = p_user
     and r2.posting_hash = run.posting_hash
     and r2.session_id <> p_session_id
     and r2.created_at < run.created_at
     and exists (select 1 from public.question_results qr where qr.session_id = r2.session_id);

  select exists (select 1 from public.question_results where user_id = p_user and question_id = p_question_id)
    into done;

  return jsonb_build_object(
    'difficulty', q.difficulty, 'topic', q.topic,
    'prior_runs_of_posting', prior, 'already_completed', done
  );
end;
$$;

-- Store the result and pay for it in ONE transaction. If the question already has a
-- stored result, nothing is paid and the stored scores are returned instead.
create or replace function public.complete_question(
  p_user uuid,
  p_session_id uuid,
  p_question_id uuid,
  p_language text,
  p_correctness int,
  p_communication int,
  p_reasoning int,
  p_xp int,
  p_coins int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.issued_questions%rowtype;
  res_id uuid;
  existing public.question_results%rowtype;
  reward jsonb;
  state public.player_progression%rowtype;
begin
  select * into q from public.issued_questions
   where question_id = p_question_id and session_id = p_session_id and user_id = p_user;
  if not found then
    raise exception 'question_not_issued' using errcode = 'P0002';
  end if;

  insert into public.question_results
    (user_id, session_id, question_id, difficulty, topic, language, correctness, communication, reasoning)
  values
    (p_user, p_session_id, p_question_id, q.difficulty, q.topic, p_language, p_correctness, p_communication, p_reasoning)
  on conflict (user_id, question_id) do nothing
  returning id into res_id;

  if res_id is null then
    select * into existing from public.question_results where user_id = p_user and question_id = p_question_id;
    perform public.ensure_player(p_user);
    select * into state from public.player_progression where user_id = p_user;
    return jsonb_build_object(
      'recorded', false,
      'language', existing.language,
      'scores', jsonb_build_object(
        'correctness', existing.correctness, 'communication', existing.communication, 'reasoning', existing.reasoning
      ),
      'reward', jsonb_build_object(
        'granted', false, 'xp_gained', 0, 'coins_gained', 0,
        'total_xp', state.total_xp, 'level', state.level, 'previous_level', state.level, 'coins', state.coins
      )
    );
  end if;

  reward := public.grant_rewards(p_user, p_xp, p_coins, 'question_completed', 'question', res_id::text);
  update public.question_results set xp_awarded = p_xp, coins_awarded = p_coins where id = res_id;

  return jsonb_build_object(
    'recorded', true,
    'language', p_language,
    'scores', jsonb_build_object('correctness', p_correctness, 'communication', p_communication, 'reasoning', p_reasoning),
    'reward', reward
  );
end;
$$;

-- Raw material for quest progress and achievements, computed in TypeScript.
create or replace function public.get_player_stats(p_user uuid, p_since timestamptz)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'questions_completed', (select count(*) from public.question_results where user_id = p_user),
    'max_communication', (select coalesce(max(communication), 0) from public.question_results where user_id = p_user),
    'max_reasoning', (select coalesce(max(reasoning), 0) from public.question_results where user_id = p_user),
    'languages', (select coalesce(jsonb_agg(distinct language), '[]'::jsonb) from public.question_results where user_id = p_user),
    'recent', (
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from (
        select created_at, difficulty, language, correctness, communication, reasoning
          from public.question_results
         where user_id = p_user and created_at >= p_since
         order by created_at desc
         limit 500
      ) r
    )
  );
$$;

-- Fix the day's quests the first time they are asked for. The advisory lock makes
-- two simultaneous first loads agree instead of inserting two different sets.
create or replace function public.ensure_daily_quests(p_user uuid, p_day date, p_defs jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_player(p_user);
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || ':' || p_day::text, 0));
  if not exists (select 1 from public.player_quests where user_id = p_user and day = p_day) then
    insert into public.player_quests (user_id, quest_id, day, target)
    select p_user, d->>'id', p_day, (d->>'target')::int
      from jsonb_array_elements(p_defs) d;
  end if;
end;
$$;

-- p_progress is {"quest_id": n, ...}, computed by the server from stored results.
-- Progress only ever goes up, and is capped at the target.
create or replace function public.update_quest_progress(p_user uuid, p_day date, p_progress jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  update public.player_quests q
     set progress = greatest(q.progress, least(q.target, (p_progress->>q.quest_id)::int)),
         completed_at = case
           when q.completed_at is null and greatest(q.progress, least(q.target, (p_progress->>q.quest_id)::int)) >= q.target
             then now()
           else q.completed_at
         end
   where q.user_id = p_user and q.day = p_day and p_progress ? q.quest_id;
$$;

-- Pays a finished quest once. A second claim, or a claim on an unfinished quest, pays nothing.
create or replace function public.claim_quest(p_user uuid, p_quest_id text, p_day date, p_xp int, p_coins int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  quest public.player_quests%rowtype;
  reward jsonb;
begin
  select * into quest from public.player_quests
   where user_id = p_user and quest_id = p_quest_id and day = p_day
   for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if quest.claimed_at is not null then
    return jsonb_build_object('status', 'already_claimed');
  end if;
  if quest.completed_at is null then
    return jsonb_build_object('status', 'not_complete');
  end if;

  update public.player_quests set claimed_at = now()
   where user_id = p_user and quest_id = p_quest_id and day = p_day;

  reward := public.grant_rewards(p_user, p_xp, p_coins, 'quest_claimed', 'quest', p_quest_id || ':' || p_day::text);
  return jsonb_build_object('status', 'claimed', 'reward', reward);
end;
$$;

-- Returns the ids that were newly unlocked by this call (none if already unlocked).
create or replace function public.unlock_achievements(p_user uuid, p_ids text[])
returns jsonb
language sql
security definer
set search_path = public
as $$
  with ins as (
    insert into public.player_achievements (user_id, achievement_id)
    select p_user, a from unnest(p_ids) a
     where exists (select 1 from public.achievements where id = a)
    on conflict (user_id, achievement_id) do nothing
    returning achievement_id
  )
  select coalesce(jsonb_agg(achievement_id), '[]'::jsonb) from ins;
$$;

create or replace function public.set_timezone(p_user uuid, p_tz text, p_cooldown_hours int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cur public.player_progression%rowtype;
begin
  if not exists (select 1 from pg_timezone_names where name = p_tz) then
    return jsonb_build_object('timezone', null, 'changed', false, 'reason', 'invalid');
  end if;
  perform public.ensure_player(p_user);
  select * into cur from public.player_progression where user_id = p_user for update;
  if cur.timezone = p_tz then
    return jsonb_build_object('timezone', cur.timezone, 'changed', false, 'reason', 'same');
  end if;
  if cur.timezone_changed_at is not null
     and cur.timezone_changed_at > now() - make_interval(hours => p_cooldown_hours) then
    return jsonb_build_object('timezone', cur.timezone, 'changed', false, 'reason', 'cooldown');
  end if;
  update public.player_progression set timezone = p_tz, timezone_changed_at = now(), updated_at = now()
   where user_id = p_user;
  return jsonb_build_object('timezone', p_tz, 'changed', true);
end;
$$;

-- Everything the Hub shows, in one round trip.
create or replace function public.get_hub(p_user uuid, p_day date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  prog public.player_progression%rowtype;
begin
  perform public.ensure_player(p_user);
  select * into prog from public.player_progression where user_id = p_user;

  return jsonb_build_object(
    'progression', jsonb_build_object(
      'total_xp', prog.total_xp, 'level', prog.level, 'coins', prog.coins, 'timezone', prog.timezone
    ),
    'quests', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'quest_id', quest_id, 'day', day, 'target', target, 'progress', progress,
        'completed', completed_at is not null, 'claimed', claimed_at is not null
      ) order by quest_id), '[]'::jsonb)
        from public.player_quests where user_id = p_user and day = p_day
    ),
    'recent_runs', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb) from (
        select r.session_id, r.role_title, r.seniority, r.created_at,
               (select count(*) from public.issued_questions iq where iq.session_id = r.session_id) as questions_total,
               count(res.id) as questions_done,
               case when count(res.id) = 0 then null
                    else round(avg((res.correctness + res.communication + res.reasoning) / 3.0)) end as avg_score,
               coalesce(sum(res.xp_awarded), 0) as xp_earned
          from public.issued_runs r
          left join public.question_results res on res.session_id = r.session_id and res.user_id = r.user_id
         where r.user_id = p_user
         group by r.session_id, r.role_title, r.seniority, r.created_at
         order by r.created_at desc
         limit 5
      ) x
    ),
    'achievements', (
      select coalesce(jsonb_agg(jsonb_build_object('id', achievement_id, 'unlocked_at', unlocked_at)
                                order by unlocked_at desc), '[]'::jsonb)
        from public.player_achievements where user_id = p_user
    )
  );
end;
$$;

-- Totals for one run, used by the results screen to decide about the level-up dialog.
create or replace function public.get_run_summary(p_user uuid, p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  prog public.player_progression%rowtype;
begin
  perform public.ensure_player(p_user);
  select * into prog from public.player_progression where user_id = p_user;
  return jsonb_build_object(
    'questions_total', (select count(*) from public.issued_questions where session_id = p_session_id and user_id = p_user),
    'questions_done', (select count(*) from public.question_results where session_id = p_session_id and user_id = p_user),
    'xp_earned', (select coalesce(sum(xp_awarded), 0) from public.question_results where session_id = p_session_id and user_id = p_user),
    'coins_earned', (select coalesce(sum(coins_awarded), 0) from public.question_results where session_id = p_session_id and user_id = p_user),
    'total_xp', prog.total_xp,
    'level', prog.level
  );
end;
$$;

-- Only the server's service_role key may call any of these.
do $$
declare
  f text;
begin
  foreach f in array array[
    'level_for_xp(int)', 'ensure_player(uuid)',
    'grant_rewards(uuid,int,int,public.progression_reason,text,text)',
    'issue_run(uuid,uuid,text,text,text,jsonb)',
    'get_question_context(uuid,uuid,uuid)',
    'complete_question(uuid,uuid,uuid,text,int,int,int,int,int)',
    'get_player_stats(uuid,timestamptz)',
    'ensure_daily_quests(uuid,date,jsonb)',
    'update_quest_progress(uuid,date,jsonb)',
    'claim_quest(uuid,text,date,int,int)',
    'unlock_achievements(uuid,text[])',
    'set_timezone(uuid,text,int)',
    'get_hub(uuid,date)',
    'get_run_summary(uuid,uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end
$$;
