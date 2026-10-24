-- Undoes supabase/migrations/20261024000000_player_progression.sql.
-- WARNING: this permanently deletes all XP, coins, quests, achievements and the
-- server-side record of issued runs and question results.

drop function if exists public.get_run_summary(uuid, uuid);
drop function if exists public.get_hub(uuid, date);
drop function if exists public.set_timezone(uuid, text, int);
drop function if exists public.unlock_achievements(uuid, text[]);
drop function if exists public.claim_quest(uuid, text, date, int, int);
drop function if exists public.update_quest_progress(uuid, date, jsonb);
drop function if exists public.ensure_daily_quests(uuid, date, jsonb);
drop function if exists public.get_player_stats(uuid, timestamptz);
drop function if exists public.complete_question(uuid, uuid, uuid, text, int, int, int, int, int);
drop function if exists public.get_question_context(uuid, uuid, uuid);
drop function if exists public.issue_run(uuid, uuid, text, text, text, jsonb);
drop function if exists public.grant_rewards(uuid, int, int, public.progression_reason, text, text);
drop function if exists public.ensure_player(uuid);
drop function if exists public.level_for_xp(int);

drop table if exists public.player_achievements;
drop table if exists public.achievements;
drop table if exists public.player_quests;
drop table if exists public.question_results;
drop table if exists public.issued_questions;
drop table if exists public.issued_runs;
drop table if exists public.coin_transactions;
drop table if exists public.xp_transactions;
drop function if exists public.reject_ledger_update();
drop table if exists public.player_progression;

drop type if exists public.progression_reason;
