-- Milestone 2: Adventure (World 1, "Syntax Valley": five levels and a boss).
--
-- How to run: Supabase dashboard -> SQL Editor -> New query -> paste this whole
-- file -> Run. Run it AFTER 20261024000000_player_progression.sql. Safe to run more
-- than once. To undo: supabase/rollback/20261025000000_adventure.down.sql.
--
-- Same security model as progression: row-level security on, players may only SELECT
-- their own rows, no client write privileges, and every write goes through a
-- SECURITY DEFINER function that only the server's service_role key can execute.
-- Unlocking is computed here from stored data, so the browser can't unlock anything.
-- Rewards are paid by the existing grant_rewards(), once per level (the ledger's
-- UNIQUE (user_id, source_type, source_id) makes a second payout impossible).

-- A new reason for the existing ledgers. (If you roll back, this value stays in the
-- enum; Postgres can't remove enum values. It is harmless.)
alter type public.progression_reason add value if not exists 'adventure_completed';

-- -------------------------------------------------------------------- tables
create table if not exists public.worlds (
  id text primary key,
  title text not null,
  blurb text not null,
  sort_order int not null default 0
);

create table if not exists public.levels (
  id text primary key,
  world_id text not null references public.worlds(id),
  order_index int not null check (order_index >= 1),
  title text not null,
  blurb text not null,
  topic text not null,
  difficulty text not null check (difficulty in ('beginner', 'easy', 'medium')),
  is_boss boolean not null default false,
  reward_xp int not null check (reward_xp between 1 and 200),
  reward_coins int not null check (reward_coins between 0 and 100),
  unique (world_id, order_index)
);

-- One row per player and level (the primary key is the UNIQUE (user_id, level_id)).
-- A level with no row yet is "locked" or "unlocked" depending on level_status().
create table if not exists public.player_level_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  level_id text not null references public.levels(id),
  status text not null check (status in ('locked', 'unlocked', 'completed')),
  attempts int not null default 0,
  failed_attempts int not null default 0,
  best_overall int check (best_overall between 0 and 100),
  best_approach int check (best_approach between 0 and 100),
  best_code int check (best_code between 0 and 100),
  best_defend int check (best_defend between 0 and 100),
  first_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, level_id)
);

-- Each start of a level is an attempt with one server-generated question.
create table if not exists public.adventure_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  level_id text not null references public.levels(id),
  question_text text not null,
  question_hash text not null,
  followups jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'passed', 'failed')),
  overall int check (overall between 0 and 100),
  first_completion boolean not null default false,
  xp_awarded int not null default 0,
  coins_awarded int not null default 0,
  unlocked jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- The three scored phases of an attempt: approach, code, defend. One row each, ever.
create table if not exists public.adventure_phases (
  attempt_id uuid not null references public.adventure_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  phase text not null check (phase in ('approach', 'code', 'defend')),
  score int not null check (score between 0 and 100),
  feedback text not null,
  submission jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (attempt_id, phase)
);

-- At most one hint per phase per attempt.
create table if not exists public.adventure_hints (
  attempt_id uuid not null references public.adventure_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  phase text not null check (phase in ('approach', 'code', 'defend')),
  hint_text text not null,
  created_at timestamptz not null default now(),
  primary key (attempt_id, phase)
);

create index if not exists adventure_attempts_user_level_idx
  on public.adventure_attempts (user_id, level_id, created_at desc);
create index if not exists adventure_attempts_user_finished_idx
  on public.adventure_attempts (user_id, finished_at desc);

-- --------------------------------------------------------------------- seed
insert into public.worlds (id, title, blurb, sort_order) values
  ('syntax_valley', 'Syntax Valley', 'Learn the basics, fix the bugs, beat the Goblin.', 1)
on conflict (id) do update set title = excluded.title, blurb = excluded.blurb, sort_order = excluded.sort_order;

insert into public.levels
  (id, world_id, order_index, title, blurb, topic, difficulty, is_boss, reward_xp, reward_coins) values
  ('sv_1', 'syntax_valley', 1, 'Variable Meadow', 'Warm up with variables and loops.',
     'variables and loops', 'beginner', false, 30, 10),
  ('sv_2', 'syntax_valley', 2, 'String Creek', 'Work with text: slice it, count it, flip it.',
     'strings', 'beginner', false, 35, 10),
  ('sv_3', 'syntax_valley', 3, 'Array Woods', 'Lists of things, and what to do with them.',
     'arrays', 'easy', false, 40, 15),
  ('sv_4', 'syntax_valley', 4, 'Function Bridge', 'Write a small function and handle the awkward inputs.',
     'simple functions and edge cases', 'easy', false, 50, 15),
  ('sv_5', 'syntax_valley', 5, 'Bug Cave', 'Read a broken snippet and find what is wrong.',
     'debugging a broken snippet', 'medium', false, 60, 20),
  ('sv_boss', 'syntax_valley', 6, 'The Debug Goblin', 'A snippet with several bugs. The Goblin will not make it easy.',
     'debugging a snippet that mixes variables, loops, strings, arrays and functions', 'medium', true, 150, 50)
on conflict (id) do update set
  world_id = excluded.world_id, order_index = excluded.order_index, title = excluded.title,
  blurb = excluded.blurb, topic = excluded.topic, difficulty = excluded.difficulty,
  is_boss = excluded.is_boss, reward_xp = excluded.reward_xp, reward_coins = excluded.reward_coins;

-- Five more achievements, all checkable from stored adventure data. The same ids
-- are in ACHIEVEMENTS in src/lib/progression/config.ts (a test keeps them in sync).
insert into public.achievements (id, name, description, sort_order) values
  ('boss_slayer', 'Boss Slayer', 'Defeat the Debug Goblin.', 7),
  ('world_explorer', 'World Explorer', 'Complete Syntax Valley.', 8),
  ('comeback', 'Comeback', 'Pass an adventure level you failed before.', 9),
  ('sharp_mind', 'Sharp Mind', 'Score 90+ overall on an adventure level.', 10),
  ('no_training_wheels', 'No Training Wheels', 'Pass an adventure level without using a hint.', 11)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

-- ----------------------------------------------------------------------- RLS
alter table public.worlds enable row level security;
alter table public.levels enable row level security;
alter table public.player_level_progress enable row level security;
alter table public.adventure_attempts enable row level security;
alter table public.adventure_phases enable row level security;
alter table public.adventure_hints enable row level security;

drop policy if exists "read worlds" on public.worlds;
create policy "read worlds" on public.worlds for select to anon, authenticated using (true);

drop policy if exists "read levels" on public.levels;
create policy "read levels" on public.levels for select to anon, authenticated using (true);

drop policy if exists "read own level progress" on public.player_level_progress;
create policy "read own level progress" on public.player_level_progress
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "read own attempts" on public.adventure_attempts;
create policy "read own attempts" on public.adventure_attempts
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "read own phases" on public.adventure_phases;
create policy "read own phases" on public.adventure_phases
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "read own hints" on public.adventure_hints;
create policy "read own hints" on public.adventure_hints
  for select to authenticated using (auth.uid() = user_id);

revoke all on public.worlds, public.levels, public.player_level_progress,
  public.adventure_attempts, public.adventure_phases, public.adventure_hints from anon, authenticated;
grant select on public.worlds, public.levels to anon, authenticated;
grant select on public.player_level_progress, public.adventure_attempts,
  public.adventure_phases, public.adventure_hints to authenticated;

-- ------------------------------------------------------------------ functions
-- 'completed', 'unlocked' or 'locked'. Level N+1 unlocks when level N is completed;
-- the boss unlocks when every non-boss level in its world is completed.
create or replace function public.level_status(p_user uuid, p_level_id text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  lv public.levels%rowtype;
  ok boolean;
begin
  select * into lv from public.levels where id = p_level_id;
  if not found then
    return null;
  end if;

  if exists (select 1 from public.player_level_progress
              where user_id = p_user and level_id = p_level_id and status = 'completed') then
    return 'completed';
  end if;

  if lv.is_boss then
    select not exists (
      select 1 from public.levels l
       where l.world_id = lv.world_id and not l.is_boss
         and not exists (select 1 from public.player_level_progress p
                          where p.user_id = p_user and p.level_id = l.id and p.status = 'completed')
    ) into ok;
  elsif lv.order_index = 1 then
    ok := true;
  else
    select exists (
      select 1 from public.levels l
        join public.player_level_progress p on p.level_id = l.id
       where l.world_id = lv.world_id and l.order_index = lv.order_index - 1
         and p.user_id = p_user and p.status = 'completed'
    ) into ok;
  end if;

  return case when ok then 'unlocked' else 'locked' end;
end;
$$;

-- The whole map for one world, with each level's computed status.
create or replace function public.get_adventure(p_user uuid, p_world text default 'syntax_valley')
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  w public.worlds%rowtype;
  levels_json jsonb;
  total int;
  done int;
  next_id text;
begin
  select * into w from public.worlds where id = p_world;
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(row order by (row->>'order_index')::int), '[]'::jsonb) into levels_json from (
    select jsonb_build_object(
      'id', l.id, 'order_index', l.order_index, 'title', l.title, 'blurb', l.blurb, 'topic', l.topic,
      'difficulty', l.difficulty, 'is_boss', l.is_boss,
      'reward_xp', l.reward_xp, 'reward_coins', l.reward_coins,
      'status', public.level_status(p_user, l.id),
      'attempts', coalesce(p.attempts, 0),
      'best_overall', p.best_overall, 'best_approach', p.best_approach,
      'best_code', p.best_code, 'best_defend', p.best_defend,
      'first_completed_at', p.first_completed_at
    ) as row
      from public.levels l
      left join public.player_level_progress p on p.level_id = l.id and p.user_id = p_user
     where l.world_id = p_world
  ) q;

  select count(*), count(*) filter (where (e->>'status') = 'completed')
    into total, done
    from jsonb_array_elements(levels_json) e;

  select e->>'id' into next_id
    from jsonb_array_elements(levels_json) e
   where (e->>'status') = 'unlocked'
   order by (e->>'order_index')::int
   limit 1;

  return jsonb_build_object(
    'world', jsonb_build_object('id', w.id, 'title', w.title, 'blurb', w.blurb),
    'levels', levels_json,
    'completed_count', done,
    'total_count', total,
    'world_complete', total > 0 and done = total,
    'next_level_id', next_id
  );
end;
$$;

-- The last few questions this player was given for a level, so a replay can ask for a new one.
create or replace function public.get_level_history(p_user uuid, p_level_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'hashes', coalesce(jsonb_agg(question_hash), '[]'::jsonb),
    'texts', coalesce(jsonb_agg(question_text), '[]'::jsonb)
  )
  from (
    select question_hash, question_text from public.adventure_attempts
     where user_id = p_user and level_id = p_level_id
     order by created_at desc limit 6
  ) h;
$$;

-- Begin an attempt. Refuses a locked level here, in the database, whatever the caller sent.
create or replace function public.start_adventure_attempt(
  p_user uuid,
  p_level_id text,
  p_question_text text,
  p_question_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  st text;
  attempt_id uuid;
begin
  st := public.level_status(p_user, p_level_id);
  if st is null then
    raise exception 'level_not_found';
  end if;
  if st = 'locked' then
    raise exception 'level_locked';
  end if;
  if p_question_text is null or length(p_question_text) < 20 or length(p_question_text) > 6000 then
    raise exception 'invalid question' using errcode = '22023';
  end if;

  perform public.ensure_player(p_user);

  insert into public.adventure_attempts (user_id, level_id, question_text, question_hash)
  values (p_user, p_level_id, p_question_text, left(p_question_hash, 100))
  returning id into attempt_id;

  insert into public.player_level_progress (user_id, level_id, status, attempts)
  values (p_user, p_level_id, 'unlocked', 1)
  on conflict (user_id, level_id) do update
    set attempts = public.player_level_progress.attempts + 1, updated_at = now();

  return jsonb_build_object('attempt_id', attempt_id, 'level_id', p_level_id, 'level_status', st);
end;
$$;

-- One attempt with its level, scored phases and hints. Only the owner can see it.
create or replace function public.get_adventure_attempt(p_user uuid, p_attempt_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  a public.adventure_attempts%rowtype;
  lv public.levels%rowtype;
begin
  select * into a from public.adventure_attempts where id = p_attempt_id and user_id = p_user;
  if not found then
    raise exception 'attempt_not_found';
  end if;
  select * into lv from public.levels where id = a.level_id;

  return jsonb_build_object(
    'attempt', jsonb_build_object(
      'id', a.id, 'level_id', a.level_id, 'status', a.status, 'overall', a.overall,
      'first_completion', a.first_completion, 'xp_awarded', a.xp_awarded, 'coins_awarded', a.coins_awarded,
      'unlocked', a.unlocked, 'followups', a.followups, 'question_text', a.question_text,
      'created_at', a.created_at, 'finished_at', a.finished_at
    ),
    'level', jsonb_build_object(
      'id', lv.id, 'order_index', lv.order_index, 'title', lv.title, 'topic', lv.topic,
      'difficulty', lv.difficulty, 'is_boss', lv.is_boss, 'reward_xp', lv.reward_xp,
      'reward_coins', lv.reward_coins, 'world_id', lv.world_id
    ),
    'phases', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'phase', phase, 'score', score, 'feedback', feedback, 'submission', submission
      ) order by created_at), '[]'::jsonb)
        from public.adventure_phases where attempt_id = a.id
    ),
    'hints', (
      select coalesce(jsonb_agg(jsonb_build_object('phase', phase, 'hint_text', hint_text)), '[]'::jsonb)
        from public.adventure_hints where attempt_id = a.id
    )
  );
end;
$$;

-- Store a phase's score. Phases go in order (approach, then code, then defend), each
-- exactly once; a second submission of a phase changes nothing and returns the first.
create or replace function public.record_adventure_phase(
  p_user uuid,
  p_attempt_id uuid,
  p_phase text,
  p_score int,
  p_feedback text,
  p_submission jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.adventure_attempts%rowtype;
  existing public.adventure_phases%rowtype;
  scored int;
begin
  if p_score < 0 or p_score > 100 then
    raise exception 'invalid score' using errcode = '22023';
  end if;

  select * into a from public.adventure_attempts where id = p_attempt_id and user_id = p_user for update;
  if not found then
    raise exception 'attempt_not_found';
  end if;
  if a.status <> 'in_progress' then
    raise exception 'attempt_finished';
  end if;

  select * into existing from public.adventure_phases where attempt_id = p_attempt_id and phase = p_phase;
  if found then
    return jsonb_build_object('recorded', false, 'phase', existing.phase, 'score', existing.score,
                              'feedback', existing.feedback);
  end if;

  if p_phase = 'code' and not exists (select 1 from public.adventure_phases where attempt_id = p_attempt_id and phase = 'approach') then
    raise exception 'phase_out_of_order';
  end if;
  if p_phase = 'defend' and (
       not exists (select 1 from public.adventure_phases where attempt_id = p_attempt_id and phase = 'code')
       or a.followups is null) then
    raise exception 'phase_out_of_order';
  end if;

  insert into public.adventure_phases (attempt_id, user_id, phase, score, feedback, submission)
  values (p_attempt_id, p_user, p_phase, p_score, left(p_feedback, 4000), coalesce(p_submission, '{}'::jsonb));

  select count(*) into scored from public.adventure_phases where attempt_id = p_attempt_id;
  return jsonb_build_object('recorded', true, 'phase', p_phase, 'score', p_score,
                            'feedback', left(p_feedback, 4000), 'scored_count', scored);
end;
$$;

-- Follow-up questions are generated on the server and stored once.
create or replace function public.store_adventure_followups(p_user uuid, p_attempt_id uuid, p_followups jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.adventure_attempts%rowtype;
begin
  select * into a from public.adventure_attempts where id = p_attempt_id and user_id = p_user for update;
  if not found then
    raise exception 'attempt_not_found';
  end if;
  if a.status <> 'in_progress' then
    raise exception 'attempt_finished';
  end if;
  if not exists (select 1 from public.adventure_phases where attempt_id = p_attempt_id and phase = 'code') then
    raise exception 'phase_out_of_order';
  end if;
  if jsonb_typeof(p_followups) <> 'array' or jsonb_array_length(p_followups) < 1 or jsonb_array_length(p_followups) > 3 then
    raise exception 'invalid followups' using errcode = '22023';
  end if;
  if a.followups is null then
    update public.adventure_attempts set followups = p_followups where id = p_attempt_id;
    return p_followups;
  end if;
  return a.followups;
end;
$$;

-- One hint per phase. If it was already used, nothing new is granted and the first text comes back.
create or replace function public.record_adventure_hint(p_user uuid, p_attempt_id uuid, p_phase text, p_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.adventure_attempts%rowtype;
  existing public.adventure_hints%rowtype;
  inserted boolean;
begin
  select * into a from public.adventure_attempts where id = p_attempt_id and user_id = p_user;
  if not found then
    raise exception 'attempt_not_found';
  end if;
  if a.status <> 'in_progress' then
    raise exception 'attempt_finished';
  end if;
  if exists (select 1 from public.adventure_phases where attempt_id = p_attempt_id and phase = p_phase) then
    raise exception 'phase_already_scored';
  end if;

  with ins as (
    insert into public.adventure_hints (attempt_id, user_id, phase, hint_text)
    values (p_attempt_id, p_user, p_phase, left(p_text, 2000))
    on conflict (attempt_id, phase) do nothing
    returning 1
  )
  select exists (select 1 from ins) into inserted;

  select * into existing from public.adventure_hints where attempt_id = p_attempt_id and phase = p_phase;
  return jsonb_build_object('granted', inserted, 'hint_text', existing.hint_text);
end;
$$;

-- Close out an attempt and pay for it, all in one transaction.
--   * Safe to call twice: a finished attempt returns its stored result and pays nothing.
--   * The first time a level is passed, the level's own reward is paid once through
--     grant_rewards, keyed by level id. Passing it again (a replay) pays only the
--     replay amounts the server passes in, which are zero by default.
--   * Failing pays nothing and does not penalize: it just counts the attempt.
create or replace function public.finalize_adventure_attempt(
  p_user uuid,
  p_attempt_id uuid,
  p_overall int,
  p_passed boolean,
  p_replay_xp int,
  p_replay_coins int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.adventure_attempts%rowtype;
  lv public.levels%rowtype;
  prog public.player_level_progress%rowtype;
  a_score int;
  c_score int;
  d_score int;
  reward jsonb;
  first_time boolean := false;
  xp int := 0;
  coins int := 0;
begin
  if p_overall < 0 or p_overall > 100 then
    raise exception 'invalid score' using errcode = '22023';
  end if;
  if p_replay_xp < 0 or p_replay_xp > 20 or p_replay_coins < 0 or p_replay_coins > 10 then
    raise exception 'invalid replay amount' using errcode = '22023';
  end if;

  select * into a from public.adventure_attempts where id = p_attempt_id and user_id = p_user for update;
  if not found then
    raise exception 'attempt_not_found';
  end if;

  if a.status <> 'in_progress' then
    return jsonb_build_object(
      'finalized', false, 'passed', a.status = 'passed', 'overall', a.overall,
      'first_completion', a.first_completion, 'xp_gained', a.xp_awarded, 'coins_gained', a.coins_awarded
    );
  end if;

  select score into a_score from public.adventure_phases where attempt_id = p_attempt_id and phase = 'approach';
  select score into c_score from public.adventure_phases where attempt_id = p_attempt_id and phase = 'code';
  select score into d_score from public.adventure_phases where attempt_id = p_attempt_id and phase = 'defend';
  if a_score is null or c_score is null or d_score is null then
    raise exception 'phases_incomplete';
  end if;

  select * into lv from public.levels where id = a.level_id;

  perform public.ensure_player(p_user);
  insert into public.player_level_progress (user_id, level_id, status)
  values (p_user, a.level_id, 'unlocked')
  on conflict (user_id, level_id) do nothing;
  select * into prog from public.player_level_progress
   where user_id = p_user and level_id = a.level_id for update;

  update public.player_level_progress set
    best_overall = greatest(coalesce(best_overall, 0), p_overall),
    best_approach = greatest(coalesce(best_approach, 0), a_score),
    best_code = greatest(coalesce(best_code, 0), c_score),
    best_defend = greatest(coalesce(best_defend, 0), d_score),
    failed_attempts = failed_attempts + case when p_passed then 0 else 1 end,
    updated_at = now()
   where user_id = p_user and level_id = a.level_id;

  if p_passed then
    if prog.status <> 'completed' then
      first_time := true;
      update public.player_level_progress
         set status = 'completed', first_completed_at = now()
       where user_id = p_user and level_id = a.level_id;
      reward := public.grant_rewards(p_user, lv.reward_xp, lv.reward_coins,
                                     'adventure_completed', 'adventure_level', a.level_id);
      xp := lv.reward_xp;
      coins := lv.reward_coins;
    elsif p_replay_xp > 0 then
      reward := public.grant_rewards(p_user, p_replay_xp, p_replay_coins,
                                     'adventure_completed', 'adventure_replay', p_attempt_id::text);
      xp := p_replay_xp;
      coins := p_replay_coins;
    end if;
  end if;

  update public.adventure_attempts set
    status = case when p_passed then 'passed' else 'failed' end,
    overall = p_overall, first_completion = first_time,
    xp_awarded = xp, coins_awarded = coins, finished_at = now()
   where id = p_attempt_id;

  return jsonb_build_object(
    'finalized', true, 'passed', p_passed, 'overall', p_overall, 'first_completion', first_time,
    'xp_gained', xp, 'coins_gained', coins, 'reward', reward, 'is_boss', lv.is_boss, 'level_id', lv.id
  );
end;
$$;

-- Remember which achievements an attempt unlocked, so its result screen can show them later.
create or replace function public.set_adventure_unlocked(p_user uuid, p_attempt_id uuid, p_unlocked jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  update public.adventure_attempts set unlocked = p_unlocked
   where id = p_attempt_id and user_id = p_user and jsonb_typeof(p_unlocked) = 'array';
$$;

-- Adventure facts for achievements and quests (read by get_player_stats below).
create or replace function public.adventure_stats(p_user uuid, p_since timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'levels_completed', (select count(*) from public.player_level_progress p join public.levels l on l.id = p.level_id
                          where p.user_id = p_user and p.status = 'completed' and not l.is_boss),
    'boss_defeated', exists (select 1 from public.player_level_progress p join public.levels l on l.id = p.level_id
                              where p.user_id = p_user and p.status = 'completed' and l.is_boss),
    'world_complete', coalesce((public.get_adventure(p_user)->>'world_complete')::boolean, false),
    'boss_unlocked', coalesce(
      (select public.level_status(p_user, l.id) <> 'locked' from public.levels l where l.is_boss limit 1), false),
    'best_overall', coalesce((select max(overall) from public.adventure_attempts
                               where user_id = p_user and status = 'passed'), 0),
    'comeback', exists (
      select 1 from public.adventure_attempts f
        join public.adventure_attempts ok on ok.user_id = f.user_id and ok.level_id = f.level_id
       where f.user_id = p_user and f.status = 'failed' and ok.status = 'passed'
         and f.finished_at < ok.finished_at),
    'unaided_pass', exists (
      select 1 from public.adventure_attempts a
       where a.user_id = p_user and a.status = 'passed'
         and not exists (select 1 from public.adventure_hints h where h.attempt_id = a.id)),
    'recent_passes', (
      select coalesce(jsonb_agg(jsonb_build_object('finished_at', a.finished_at, 'is_boss', l.is_boss)), '[]'::jsonb)
        from (select * from public.adventure_attempts
               where user_id = p_user and status = 'passed' and finished_at >= p_since
               order by finished_at desc limit 200) a
        join public.levels l on l.id = a.level_id
    )
  );
$$;

-- get_player_stats and get_hub now also carry adventure data.
create or replace function public.get_player_stats(p_user uuid, p_since timestamptz)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'timezone', coalesce((select timezone from public.player_progression where user_id = p_user), 'UTC'),
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
    ),
    'adventure', public.adventure_stats(p_user, p_since)
  );
$$;

create or replace function public.get_hub(p_user uuid, p_day date, p_defs jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  prog public.player_progression%rowtype;
  adv jsonb;
  next_level jsonb;
begin
  perform public.ensure_player(p_user);
  if p_defs is not null then
    perform public.ensure_daily_quests(p_user, p_day, p_defs);
  end if;
  select * into prog from public.player_progression where user_id = p_user;

  adv := public.get_adventure(p_user);
  select e into next_level from jsonb_array_elements(adv->'levels') e where e->>'id' = adv->>'next_level_id';

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
    ),
    'adventure', jsonb_build_object(
      'world_title', adv->'world'->>'title',
      'completed_count', adv->'completed_count',
      'total_count', adv->'total_count',
      'world_complete', adv->'world_complete',
      'next_level', next_level
    )
  );
end;
$$;

-- Only the server's service_role key may call any of these.
do $$
declare
  f text;
begin
  foreach f in array array[
    'level_status(uuid,text)',
    'get_adventure(uuid,text)',
    'get_level_history(uuid,text)',
    'start_adventure_attempt(uuid,text,text,text)',
    'get_adventure_attempt(uuid,uuid)',
    'record_adventure_phase(uuid,uuid,text,int,text,jsonb)',
    'store_adventure_followups(uuid,uuid,jsonb)',
    'record_adventure_hint(uuid,uuid,text,text)',
    'finalize_adventure_attempt(uuid,uuid,int,boolean,int,int)',
    'set_adventure_unlocked(uuid,uuid,jsonb)',
    'adventure_stats(uuid,timestamptz)',
    'get_player_stats(uuid,timestamptz)',
    'get_hub(uuid,date,jsonb)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end
$$;
