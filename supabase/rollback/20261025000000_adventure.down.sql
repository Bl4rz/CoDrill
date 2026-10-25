-- Undoes supabase/migrations/20261025000000_adventure.sql.
-- WARNING: this permanently deletes all adventure progress and attempts.
-- Not undone: the 'adventure_completed' value added to progression_reason stays
-- (Postgres can't drop enum values); XP already paid stays in the ledgers.

-- Restore the Milestone 1 versions of the two functions that were extended.
-- (They are re-created exactly as in 20261024000000_player_progression.sql, minus adventure data.)
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
    )
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
begin
  perform public.ensure_player(p_user);
  if p_defs is not null then
    perform public.ensure_daily_quests(p_user, p_day, p_defs);
  end if;
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

delete from public.player_achievements
 where achievement_id in ('boss_slayer', 'world_explorer', 'comeback', 'sharp_mind', 'no_training_wheels');
delete from public.achievements
 where id in ('boss_slayer', 'world_explorer', 'comeback', 'sharp_mind', 'no_training_wheels');

drop function if exists public.adventure_stats(uuid, timestamptz);
drop function if exists public.set_adventure_unlocked(uuid, uuid, jsonb);
drop function if exists public.finalize_adventure_attempt(uuid, uuid, int, boolean, int, int);
drop function if exists public.record_adventure_hint(uuid, uuid, text, text);
drop function if exists public.store_adventure_followups(uuid, uuid, jsonb);
drop function if exists public.record_adventure_phase(uuid, uuid, text, int, text, jsonb);
drop function if exists public.get_adventure_attempt(uuid, uuid);
drop function if exists public.start_adventure_attempt(uuid, text, text, text);
drop function if exists public.get_level_history(uuid, text);
drop function if exists public.get_adventure(uuid, text);
drop function if exists public.level_status(uuid, text);

drop table if exists public.adventure_hints;
drop table if exists public.adventure_phases;
drop table if exists public.adventure_attempts;
drop table if exists public.player_level_progress;
drop table if exists public.levels;
drop table if exists public.worlds;
