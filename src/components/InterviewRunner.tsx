"use client";

import { useEffect, useRef, useState } from "react";
import {
  ApproachFeedback,
  Attempt,
  CodeLanguage,
  FollowUpQA,
  InterviewQuestion,
} from "@/lib/types";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { CodeEditor } from "@/components/CodeEditor";
import { VoiceTextArea } from "@/components/VoiceTextArea";
import { Mascot, type Expression } from "@/components/pixel/Mascot";
import { PixelButton } from "@/components/pixel/PixelButton";
import { SegmentBar } from "@/components/pixel/SegmentBar";
import { StepProgress } from "@/components/pixel/StepProgress";
import { Typewriter } from "@/components/pixel/Typewriter";
import { ArrowIcon, CheckIcon } from "@/components/pixel/icons";
import { shadowColor } from "@/components/pixel/style";
import { postJson } from "@/lib/api-client";
import { useSpeechSynthesis } from "@/lib/useSpeechSynthesis";
import { useServerSpeech } from "@/lib/useServerSpeech";

type Stage = "approach" | "coding" | "followup" | "scored";

const APPROACH_PROMPT = "Before you write any code, walk me through how you'd approach this.";

interface TranscriptEntry {
  speaker: "interviewer" | "you";
  text: string;
  expression?: Expression;
}

const STEPS: { stage: Stage; label: string }[] = [
  { stage: "approach", label: "Approach" },
  { stage: "coding", label: "Code" },
  { stage: "followup", label: "Follow-ups" },
];

function expressionForScore(avg: number): Expression {
  if (avg >= 70) return "impressed";
  if (avg >= 50) return "neutral";
  return "concerned";
}

function StageTracker({ stage }: { stage: Stage }) {
  const current = STEPS.findIndex((s) => s.stage === stage);
  const allDone = stage === "scored";
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Stages">
      {STEPS.map((step, i) => {
        const done = allDone || i < current;
        const active = !allDone && i === current;
        return (
          <li key={step.stage} className="flex items-center gap-2">
            {i > 0 && (
              <span aria-hidden="true" className="text-paper">
                <ArrowIcon unit="2px" />
              </span>
            )}
            <span
              className={`flex items-center gap-2 border-[3px] px-2 py-1 font-display text-xs uppercase tracking-widest ${
                done
                  ? "border-green bg-green text-ink"
                  : active
                    ? "border-amber bg-amber text-ink"
                    : "border-dashed border-paper text-paper"
              }`}
              aria-current={active ? "step" : undefined}
            >
              {done && <CheckIcon />}
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Avatar({ expression }: { expression: Expression }) {
  return (
    <div className="shrink-0 border-[3px] border-paper bg-ink p-1">
      <Mascot crop="head" expression={expression} unit="3px" title="Interviewer" />
    </div>
  );
}

function InterviewerLine({
  entry,
  typing,
  onDone,
}: {
  entry: TranscriptEntry;
  typing: boolean;
  onDone: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <Avatar expression={entry.expression ?? "neutral"} />
      <div className="px-dialog min-w-0 flex-1 p-4">
        <p className="mb-1 font-display text-xs uppercase tracking-widest">Interviewer</p>
        {typing ? (
          <Typewriter text={entry.text} onDone={onDone} className="text-base leading-relaxed" />
        ) : (
          <p className="text-base leading-relaxed">{entry.text}</p>
        )}
      </div>
    </div>
  );
}

function YouLine({ text }: { text: string }) {
  return (
    <div className="ml-auto max-w-[90%] border-[3px] border-green bg-ink p-3 text-left sm:max-w-[80%]">
      <p className="mb-1 font-display text-xs uppercase tracking-widest text-green">You</p>
      <p className="whitespace-pre-wrap text-base leading-relaxed">{text}</p>
    </div>
  );
}

export function InterviewRunner({
  question,
  levelNumber,
  levelCount,
  isBoss,
  onComplete,
}: {
  question: InterviewQuestion;
  levelNumber: number;
  levelCount: number;
  isBoss: boolean;
  onComplete: (attempt: Attempt) => void;
}) {
  const [stage, setStage] = useState<Stage>("approach");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([
    { speaker: "interviewer", text: question.question_text, expression: "neutral" },
    { speaker: "interviewer", text: APPROACH_PROMPT, expression: "neutral" },
  ]);
  // Index of the first transcript entry that hasn't finished typing. Your own
  // lines count as already finished, so they are skipped past automatically.
  const [typed, setTyped] = useState(0);
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
  const serverTts = useServerSpeech();
  // Prefer the server-synthesized voice (Edge TTS, then Google Cloud TTS,
  // then Azure — see /api/tts/speak); fall back to the browser's own voice
  // only if that request fails outright (e.g. genuinely offline, or every
  // provider in that chain is down at once).
  const tts = serverTts.isSupported ? serverTts : browserTts;
  const [voiceOn, setVoiceOn] = useState(true);
  const [lastSpokenText, setLastSpokenText] = useState("");
  const hasSpokenIntroRef = useRef(false);
  const lastSpokenTextRef = useRef("");

  function say(text: string) {
    setLastSpokenText(text);
    lastSpokenTextRef.current = text;
    if (voiceOn && tts.isSupported) tts.speak(text);
  }

  useEffect(() => {
    // Switching tabs doesn't unmount this component, so nothing was stopping
    // the interviewer's audio when you looked away — it just kept talking to
    // an empty room. Stop it the moment the tab is hidden, and since you
    // likely missed part of it, replay the same line when you come back
    // instead of leaving you to guess what you missed.
    function handleVisibilityChange() {
      if (document.hidden) {
        tts.cancel();
      } else if (voiceOn && tts.isSupported && lastSpokenTextRef.current) {
        tts.speak(lastSpokenTextRef.current);
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [tts, voiceOn]);

  useEffect(() => {
    // One combined utterance, not two separate say() calls — say() only
    // remembers the most recent thing spoken, so back-to-back calls left
    // "Repeat" only able to replay the second line ("walk me through your
    // approach") and never the actual question that came before it.
    if (hasSpokenIntroRef.current) return;
    hasSpokenIntroRef.current = true;
    say(`${question.question_text} ${APPROACH_PROMPT}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => tts.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (transcript[typed]?.speaker === "you") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- advancing past your own lines as the transcript grows
      setTyped((t) => t + 1);
    }
  }, [typed, transcript]);

  function addInterviewerLine(text: string, expression: Expression) {
    setTranscript((t) => [...t, { speaker: "interviewer", text, expression }]);
  }

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
        },
      );
      addInterviewerLine(feedback.message, feedback.verdict === "proceed" ? "impressed" : "thinking");
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
      const { questions } = await postJson<{ questions: string[] }>("/api/interview/followup", {
        question_text: question.question_text,
        approach_text: approachFinal,
        code_submission: code,
        code_language: language,
      });
      setFollowupQuestions(questions);
      setFollowupAnswers(questions.map(() => ""));
      questions.forEach((q) => addInterviewerLine(q, "thinking"));
      // One combined utterance for the same reason as the intro above — so
      // Repeat can replay every follow-up question, not just the last one.
      say(questions.join(" "));
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
    setTranscript((t) => [
      ...t,
      ...followupAnswers.map((a) => ({ speaker: "you" as const, text: a })),
    ]);
    try {
      const { scores } = await postJson<{ scores: Attempt["scores"] }>("/api/interview/score", {
        question_text: question.question_text,
        approach_text: approachFinal,
        code_submission: code,
        code_language: language,
        follow_up_qa,
      });
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
      if (scores) {
        const avg = (scores.correctness_score + scores.communication_score + scores.reasoning_score) / 3;
        addInterviewerLine(scores.feedback_text, expressionForScore(avg));
        say(scores.feedback_text);
      }
      setStage("scored");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const showEditor = stage === "coding" || stage === "followup" || stage === "scored";
  const isLast = levelNumber === levelCount;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-[3px] border-paper bg-ink px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-display text-lg uppercase tracking-widest">
            Level {levelNumber}/{levelCount}
          </span>
          {isBoss && (
            <span className="bg-red px-2 py-0.5 font-display text-xs uppercase tracking-widest text-ink">
              Boss
            </span>
          )}
          <DifficultyBadge difficulty={question.difficulty} />
          <span className="font-display text-xs uppercase tracking-widest text-green">{question.topic}</span>
        </div>
        <StageTracker stage={stage} />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex w-full flex-col gap-4 lg:w-[420px] lg:shrink-0">
          {tts.isSupported && (
            <div className="flex flex-wrap items-center gap-2">
              <PixelButton
                variant="ghost"
                size="sm"
                onClick={() => tts.speak("Hi, I'm your interviewer for today's session.")}
                title="Preview this voice"
              >
                Preview voice
              </PixelButton>
              {lastSpokenText && (
                <PixelButton
                  variant={tts.isSpeaking ? "danger" : "ghost"}
                  size="sm"
                  onClick={() => {
                    if (tts.isSpeaking) {
                      tts.cancel();
                    } else {
                      tts.speak(lastSpokenText);
                    }
                  }}
                  title={tts.isSpeaking ? "Stop" : "Repeat the last thing the interviewer said"}
                >
                  {tts.isSpeaking ? "Stop" : "Repeat"}
                </PixelButton>
              )}
              <PixelButton
                variant={voiceOn ? "amber" : "ghost"}
                size="sm"
                aria-pressed={voiceOn}
                onClick={() => {
                  setVoiceOn((v) => {
                    if (v) tts.cancel();
                    return !v;
                  });
                }}
                title={voiceOn ? "Mute interviewer voice" : "Unmute interviewer voice"}
              >
                Voice {voiceOn ? "on" : "off"}
              </PixelButton>
              {tts === browserTts && browserTts.voices.length > 1 && (
                <select
                  value={browserTts.voiceURI ?? ""}
                  onChange={(e) => browserTts.selectVoice(e.target.value)}
                  title="Interviewer voice"
                  aria-label="Interviewer voice"
                  className="max-w-[160px] border-[3px] border-paper bg-ink px-2 py-1.5 text-sm text-paper focus:outline-3 focus:outline-offset-2 focus:outline-amber"
                >
                  {browserTts.voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="flex flex-col gap-4" aria-live="polite">
            {transcript.map((entry, i) => {
              if (i > typed) return null;
              if (entry.speaker === "you") return <YouLine key={i} text={entry.text} />;
              return (
                <InterviewerLine
                  key={i}
                  entry={entry}
                  typing={i === typed}
                  onDone={() => setTyped((t) => (t === i ? t + 1 : t))}
                />
              );
            })}

            {loading && stage !== "scored" && (
              <div className="flex items-start gap-3">
                <Avatar expression="thinking" />
                <div className="border-[3px] border-dashed border-paper px-4 py-3">
                  <p className="font-display text-sm uppercase tracking-widest">
                    <span className="blink-cursor">Thinking...</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {stage === "scored" && attempt?.scores && (
            <div className="pixel-panel flex flex-col gap-4 border-paper bg-ink p-4" style={shadowColor("var(--green)")}>
              <p className="font-display text-base uppercase tracking-widest text-green">Level complete</p>
              <SegmentBar label="Correctness" value={attempt.scores.correctness_score} animate />
              <SegmentBar label="Communication" value={attempt.scores.communication_score} animate delay={900} />
              <SegmentBar label="Reasoning" value={attempt.scores.reasoning_score} animate delay={1800} />
            </div>
          )}

          {stage === "approach" && (
            <div className="flex flex-col gap-3">
              <VoiceTextArea
                value={approachDraft}
                onChange={setApproachDraft}
                placeholder="Describe your approach in your own words, or tap the mic and say it."
                label="Your approach"
                rows={5}
                disabled={loading}
              />
              <div>
                <PixelButton onClick={submitApproach} disabled={loading || approachDraft.trim().length < 5}>
                  {loading ? "Thinking..." : "Send"}
                </PixelButton>
              </div>
            </div>
          )}

          {stage === "followup" && (
            <div className="flex flex-col gap-4">
              {followupQuestions.map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <p className="font-display text-xs uppercase tracking-widest text-amber">
                    Answer to follow-up {i + 1}
                  </p>
                  <VoiceTextArea
                    value={followupAnswers[i]}
                    onChange={(v) => {
                      const next = [...followupAnswers];
                      next[i] = v;
                      setFollowupAnswers(next);
                    }}
                    rows={3}
                    disabled={loading}
                    label={`Answer to follow-up ${i + 1}`}
                    placeholder="Your answer, or tap the mic and say it."
                  />
                </div>
              ))}
              {loading ? (
                <StepProgress messages={["Reading your answers...", "Scoring the level...", "Writing feedback..."]} />
              ) : (
                <div>
                  <PixelButton
                    onClick={submitFollowups}
                    disabled={followupAnswers.some((a) => a.trim().length === 0)}
                  >
                    Submit answers
                  </PixelButton>
                </div>
              )}
            </div>
          )}

          {stage === "scored" && (
            <div>
              <PixelButton onClick={() => attempt && onComplete(attempt)}>
                {isLast ? "See results" : "Next level"}
              </PixelButton>
            </div>
          )}

          {error && (
            <p role="alert" className="border-[3px] border-red px-3 py-2 text-base text-red">
              {error}
            </p>
          )}
        </div>

        {showEditor && (
          <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
            <CodeEditor
              language={language}
              onLanguageChange={setLanguage}
              value={code}
              onChange={setCode}
            />
            {stage === "coding" && (
              <div className="flex flex-col gap-3">
                {loading ? (
                  <StepProgress messages={["Reading your code...", "Thinking of follow-ups..."]} />
                ) : (
                  <div>
                    <PixelButton onClick={submitCode} disabled={code.trim().length < 3}>
                      Submit code
                    </PixelButton>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
