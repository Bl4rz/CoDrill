"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ApproachFeedback,
  Attempt,
  CodeLanguage,
  FollowUpQA,
  InterviewQuestion,
} from "@/lib/types";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { CodeEditor } from "@/components/CodeEditor";
import { Spinner } from "@/components/Spinner";
import { VoiceTextArea } from "@/components/VoiceTextArea";
import { useSpeechSynthesis } from "@/lib/useSpeechSynthesis";
import { useElevenLabsSpeech } from "@/lib/useElevenLabsSpeech";

type Stage = "approach" | "coding" | "followup" | "scored";

interface TranscriptEntry {
  speaker: "interviewer" | "you";
  text: string;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data as T;
}

export function InterviewRunner({
  question,
  onComplete,
}: {
  question: InterviewQuestion;
  onComplete: (attempt: Attempt) => void;
}) {
  const [stage, setStage] = useState<Stage>("approach");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([
    { speaker: "interviewer", text: question.question_text },
    {
      speaker: "interviewer",
      text: "Before you write any code, walk me through how you'd approach this.",
    },
  ]);
  const [approachDraft, setApproachDraft] = useState("");
  const [approachRounds, setApproachRounds] = useState<ApproachFeedback[]>([]);
  const [approachFinal, setApproachFinal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [language, setLanguage] = useState<CodeLanguage>("javascript");
  const [code, setCode] = useState("");

  const [followupQuestions, setFollowupQuestions] = useState<string[]>([]);
  const [followupAnswers, setFollowupAnswers] = useState<string[]>([]);

  const [attempt, setAttempt] = useState<Attempt | null>(null);

  const browserTts = useSpeechSynthesis();
  const cloudTts = useElevenLabsSpeech();
  // Prefer the human-sounding ElevenLabs voice; fall back to the free browser
  // voice whenever it's not configured, or if a request fails mid-session
  // (e.g. the free monthly quota runs out).
  const tts = cloudTts.isSupported ? cloudTts : browserTts;
  const [voiceOn, setVoiceOn] = useState(true);
  const [lastSpokenText, setLastSpokenText] = useState("");
  const hasSpokenIntroRef = useRef(false);

  function say(text: string) {
    setLastSpokenText(text);
    if (voiceOn && tts.isSupported) tts.speak(text);
  }

  useEffect(() => {
    // Wait for the ElevenLabs voice-list fetch to settle before deciding which
    // backend to use, so the very first lines of a question don't speak in the
    // browser voice just because that check resolves synchronously and the
    // cloud one is still an in-flight network request.
    if (!cloudTts.ready || hasSpokenIntroRef.current) return;
    hasSpokenIntroRef.current = true;
    say(question.question_text);
    say("Before you write any code, walk me through how you'd approach this.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudTts.ready]);

  useEffect(() => {
    return () => tts.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitApproach() {
    if (approachDraft.trim().length < 5) return;
    setLoading(true);
    setError(null);
    const combinedApproach = [approachFinal, approachDraft].filter(Boolean).join("\n\n");
    setTranscript((t) => [...t, { speaker: "you", text: approachDraft }]);
    try {
      const { feedback } = await postJson<{ feedback: ApproachFeedback }>(
        "/api/interview/approach",
        {
          question_text: question.question_text,
          approach_text: combinedApproach,
          prior_rounds: approachRounds,
        }
      );
      setTranscript((t) => [...t, { speaker: "interviewer", text: feedback.message }]);
      say(feedback.message);
      setApproachRounds((r) => [...r, feedback]);
      setApproachFinal(combinedApproach);
      setApproachDraft("");
      if (feedback.verdict === "proceed") {
        setStage("coding");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function submitCode() {
    if (code.trim().length < 3) return;
    setLoading(true);
    setError(null);
    try {
      const { questions } = await postJson<{ questions: string[] }>(
        "/api/interview/followup",
        {
          question_text: question.question_text,
          approach_text: approachFinal,
          code_submission: code,
          code_language: language,
        }
      );
      setFollowupQuestions(questions);
      setFollowupAnswers(questions.map(() => ""));
      questions.forEach(say);
      setStage("followup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function submitFollowups() {
    if (followupAnswers.some((a) => a.trim().length === 0)) return;
    setLoading(true);
    setError(null);
    const follow_up_qa: FollowUpQA[] = followupQuestions.map((q, i) => ({
      question: q,
      answer: followupAnswers[i],
    }));
    try {
      const { scores } = await postJson<{ scores: Attempt["scores"] }>(
        "/api/interview/score",
        {
          question_text: question.question_text,
          approach_text: approachFinal,
          code_submission: code,
          code_language: language,
          follow_up_qa,
        }
      );
      const finalAttempt: Attempt = {
        question_id: question.id,
        approach_text: approachFinal,
        approach_rounds: approachRounds,
        code_submission: code,
        code_language: language,
        follow_up_qa,
        scores,
      };
      setAttempt(finalAttempt);
      if (scores) say(scores.feedback_text);
      setStage("scored");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const showEditor = stage === "coding" || stage === "followup" || stage === "scored";

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex w-full flex-col gap-4 lg:w-[380px] lg:shrink-0">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <DifficultyBadge difficulty={question.difficulty} />
            <span className="text-xs uppercase tracking-wide text-muted">{question.topic}</span>
          </div>
          {tts.isSupported && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-muted">
                {cloudTts.isSupported ? "ElevenLabs voice" : "Browser voice"}
              </span>
              {tts.voices.length > 1 && (
                <>
                  <select
                    value={tts.voiceURI ?? ""}
                    onChange={(e) => tts.selectVoice(e.target.value)}
                    title="Interviewer voice"
                    className="max-w-[140px] rounded-md border border-border bg-surface px-1.5 py-1 text-xs text-foreground focus:border-accent-green focus:outline-none"
                  >
                    {tts.voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => tts.speak("Hi, I'm your interviewer for today's session.")}
                    title="Preview this voice"
                    className="rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:border-accent-green hover:text-accent-green"
                  >
                    ▶ Preview
                  </button>
                </>
              )}
              {lastSpokenText && (
                <button
                  type="button"
                  onClick={() => tts.speak(lastSpokenText)}
                  title="Repeat the last thing the interviewer said"
                  className="rounded-full border border-border px-2 py-1 text-xs text-muted transition hover:border-accent-green hover:text-accent-green"
                >
                  🔁 Repeat
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setVoiceOn((v) => {
                    if (v) tts.cancel();
                    return !v;
                  });
                }}
                title={voiceOn ? "Mute interviewer voice" : "Unmute interviewer voice"}
                className={`rounded-full border px-2 py-1 text-xs transition ${
                  voiceOn
                    ? "border-accent-green/40 text-accent-green"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {voiceOn ? "🔊 Voice on" : "🔇 Voice off"}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          {transcript.map((entry, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={entry.speaker === "you" ? "text-right" : ""}
            >
              <p className="mb-1 text-[10px] font-mono uppercase tracking-wider text-muted">
                {entry.speaker === "interviewer" ? "Interviewer" : "You"}
              </p>
              <p
                className={`inline-block max-w-full rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  entry.speaker === "interviewer"
                    ? "bg-surface-raised text-foreground"
                    : "bg-accent-green/10 text-foreground"
                }`}
              >
                {entry.text}
              </p>
            </motion.div>
          ))}

          {stage === "scored" && attempt?.scores && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-2 rounded-lg border border-accent-green/30 bg-accent-green/5 p-3"
            >
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-accent-green">
                Question complete
              </p>
              <div className="mb-2 grid grid-cols-3 gap-2 text-center">
                <ScorePill label="Correctness" value={attempt.scores.correctness_score} />
                <ScorePill label="Communication" value={attempt.scores.communication_score} />
                <ScorePill label="Reasoning" value={attempt.scores.reasoning_score} />
              </div>
              <p className="text-sm text-foreground">{attempt.scores.feedback_text}</p>
            </motion.div>
          )}
        </div>

        {stage === "approach" && (
          <div className="flex flex-col gap-2">
            <VoiceTextArea
              value={approachDraft}
              onChange={setApproachDraft}
              placeholder="Describe your approach in your own words, or tap the mic to speak it…"
              rows={5}
              disabled={loading}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={submitApproach}
                disabled={loading || approachDraft.trim().length < 5}
                className="rounded-md bg-accent-green px-4 py-2 text-sm font-medium text-background transition hover:scale-[1.03] hover:bg-accent-green/90 active:scale-[0.97] disabled:opacity-40 disabled:hover:scale-100"
              >
                {loading ? "Thinking…" : "Send"}
              </button>
              {loading && <Spinner />}
            </div>
          </div>
        )}

        {stage === "followup" && (
          <div className="flex flex-col gap-3">
            {followupQuestions.map((q, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <p className="text-sm text-foreground">{q}</p>
                <VoiceTextArea
                  value={followupAnswers[i]}
                  onChange={(v) => {
                    const next = [...followupAnswers];
                    next[i] = v;
                    setFollowupAnswers(next);
                  }}
                  rows={3}
                  disabled={loading}
                  placeholder="Your answer, or tap the mic to speak it…"
                />
              </div>
            ))}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={submitFollowups}
                disabled={loading || followupAnswers.some((a) => a.trim().length === 0)}
                className="rounded-md bg-accent-green px-4 py-2 text-sm font-medium text-background transition hover:scale-[1.03] hover:bg-accent-green/90 active:scale-[0.97] disabled:opacity-40 disabled:hover:scale-100"
              >
                {loading ? "Scoring…" : "Submit answers"}
              </button>
              {loading && <Spinner />}
            </div>
          </div>
        )}

        {stage === "scored" && (
          <button
            type="button"
            onClick={() => attempt && onComplete(attempt)}
            className="rounded-md bg-accent-green/15 px-4 py-2 text-sm font-medium text-accent-green hover:bg-accent-green/25"
          >
            Next question →
          </button>
        )}

        {error && <p className="text-sm text-accent-red">{error}</p>}
      </div>

      {showEditor && (
        <div className="flex w-full flex-1 flex-col gap-3">
          <CodeEditor
            language={language}
            onLanguageChange={setLanguage}
            value={code}
            onChange={setCode}
          />
          {stage === "coding" && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={submitCode}
                disabled={loading || code.trim().length < 3}
                className="rounded-md bg-accent-green px-4 py-2 text-sm font-medium text-background transition hover:scale-[1.03] hover:bg-accent-green/90 active:scale-[0.97] disabled:opacity-40 disabled:hover:scale-100"
              >
                {loading ? "Reviewing…" : "Submit code"}
              </button>
              {loading && <Spinner label="Preparing follow-up questions" />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-surface px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className="font-mono text-sm text-foreground">{value}</p>
    </div>
  );
}
