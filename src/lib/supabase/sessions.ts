"use client";

import { createClient } from "@/lib/supabase/client";
import type { StoredSession } from "@/lib/store";

interface CloudSessionRow {
  id: string;
  job_posting_text: string;
  role_summary: StoredSession["role_summary"];
  questions: StoredSession["questions"];
  attempts: StoredSession["attempts"];
  current_question_index: number;
  report: StoredSession["report"];
  created_at: string;
}

function rowToSession(row: CloudSessionRow): StoredSession {
  return {
    id: row.id,
    job_posting_text: row.job_posting_text,
    role_summary: row.role_summary,
    questions: row.questions,
    attempts: row.attempts,
    current_question_index: row.current_question_index,
    report: row.report,
    created_at: row.created_at,
  };
}

/**
 * Fire-and-forget cloud sync, called from store.ts's saveSession() on every
 * local save. No-ops silently if signed out or Supabase isn't configured --
 * cloud sync is additive on top of localStorage, never a requirement for the
 * app to work.
 */
export async function syncSessionToCloud(session: StoredSession): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("interview_sessions").upsert({
    id: session.id,
    user_id: user.id,
    job_posting_text: session.job_posting_text,
    role_summary: session.role_summary,
    questions: session.questions,
    attempts: session.attempts,
    current_question_index: session.current_question_index,
    report: session.report,
    created_at: session.created_at,
  });

  if (error) {
    console.error("Cloud session sync failed:", error.message);
  }
}

export async function fetchCloudSessions(): Promise<StoredSession[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("interview_sessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Failed to fetch cloud sessions:", error?.message);
    return [];
  }

  return (data as CloudSessionRow[]).map(rowToSession);
}

export async function fetchCloudSession(id: string): Promise<StoredSession | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return rowToSession(data as CloudSessionRow);
}
