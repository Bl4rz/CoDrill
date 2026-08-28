"use client";

import { Attempt, InterviewQuestion, RoleSummary, SessionReport } from "@/lib/types";

export interface StoredSession {
  id: string;
  job_posting_text: string;
  role_summary: RoleSummary;
  questions: InterviewQuestion[];
  attempts: Record<string, Attempt>;
  current_question_index: number;
  report: SessionReport | null;
  created_at: string;
}

const KEY_PREFIX = "codrill:session:";
const INDEX_KEY = "codrill:sessions";

function isBrowser() {
  return typeof window !== "undefined";
}

export function createSession(
  job_posting_text: string,
  role_summary: RoleSummary,
  questions: InterviewQuestion[]
): StoredSession {
  const session: StoredSession = {
    id: crypto.randomUUID(),
    job_posting_text,
    role_summary,
    questions,
    attempts: {},
    current_question_index: 0,
    report: null,
    created_at: new Date().toISOString(),
  };
  saveSession(session);
  return session;
}

export function saveSession(session: StoredSession) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY_PREFIX + session.id, JSON.stringify(session));
  const index: string[] = JSON.parse(localStorage.getItem(INDEX_KEY) || "[]");
  if (!index.includes(session.id)) {
    localStorage.setItem(INDEX_KEY, JSON.stringify([...index, session.id]));
  }
}

export function loadSession(id: string): StoredSession | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(KEY_PREFIX + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function hasCompletedAnySession(): boolean {
  if (!isBrowser()) return false;
  const index: string[] = JSON.parse(localStorage.getItem(INDEX_KEY) || "[]");
  return index
    .map(loadSession)
    .some((s) => s && s.report !== null);
}

export function saveAttempt(sessionId: string, questionId: string, attempt: Attempt) {
  const session = loadSession(sessionId);
  if (!session) return;
  session.attempts[questionId] = attempt;
  saveSession(session);
}
