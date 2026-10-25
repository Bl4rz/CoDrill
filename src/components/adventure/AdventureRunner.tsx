"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ADVENTURE, PHASES, type Phase } from "@/lib/adventure/config";
import type { AttemptView, FinishedResult } from "@/lib/adventure/types";
import { ApiError, postJson } from "@/lib/api-client";
import { showToast } from "@/lib/toast";
import { useInterviewerVoice } from "@/lib/useInterviewerVoice";
import type { CodeLanguage } from "@/lib/types";
import { AppHeader } from "@/components/AppHeader";
import { CodeEditor } from "@/components/CodeEditor";
import { VoiceTextArea } from "@/components/VoiceTextArea";
import { BossArena, type DamagePop } from "@/components/adventure/BossArena";
import { DifficultyTag } from "@/components/adventure/DifficultyTag";
import { PhaseTracker } from "@/components/adventure/PhaseTracker";
import { ResultScreen } from "@/components/adventure/ResultScreen";
import { SkeletonPanel } from "@/components/hub/Skeleton";
import { StatusMessage } from "@/components/hub/StatusMessage";
import { Avatar, InterviewerLine, YouLine, type TranscriptEntry } from "@/components/interview/Lines";
import { VoiceControls } from "@/components/interview/VoiceControls";
import { LevelUpDialog } from "@/components/pixel/LevelUpDialog";
import type { GoblinState } from "@/components/pixel/GoblinSprite";
import type { Expression } from "@/components/pixel/Mascot";
import { PixelButton, PixelLink } from "@/components/pixel/PixelButton";
import { StepProgress } from "@/components/pixel/StepProgress";
import { signInWithGoogle } from "@/lib/auth";

const CRUMBS = (title: string) => [{ label: "Home", href: "/" }, { label: "Adventure", href: "/adventure" }, { label: title }];

const PHASE_LABELS = {
  normal: { approach: "Approach", code: "Code", defend: "Follow-ups" } satisfies Record<Phase, string>,
  boss: { approach: "Explain", code: "Fix it", defend: "Defend" } satisfies Record<Phase, string>,
};

const PROMPTS = {
  normal: {
    approach: "Before you write any code, walk me through how you'd approach this.",
    code: "That makes sense. Now write it out.",
  },
  boss: {
    approach: "Phase 1. Tell me what you think is going wrong, before you change anything.",
    code: "Phase 2. Now fix it. Write the corrected code.",
  },
};

type Load =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "ready" };

interface Problem {
  message: string;
  /** What the RETRY button does, when trying again makes sense */
  retry?: () => void;
}

const HIT_MS = 700;
const DAMAGE_MS = 1300;
const RESULT_DELAY_BOSS_MS = 1500;

function expressionForScore(score: number): Expression {
  if (score >= 70) return "impressed";
  if (score >= 50) return "neutral";
  return "concerned";
}

/** A finished attempt that is opened again later: rebuild the result from what is stored. */
function storedResult(view: AttemptView): FinishedResult {
  const passed = view.status === "passed";
  return {
    passed,
    victory: passed && view.level.is_boss,
    overall: view.overall ?? 0,
    first_completion: view.first_completion,
    xp_gained: view.xp_awarded,
    coins_gained: view.coins_awarded,
    unlocked: view.unlocked,
    level_up: null,
  };
}

/**
 * One question, three steps: approach → code → defend. The server stores every score and
 * decides HP, pass/fail, rewards and unlocks; this screen only sends answers and shows
 * what comes back. Nothing here is timed, and nothing the browser holds can change a result.
 */
export function AdventureRunner({ attemptId }: { attemptId: string }) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [view, setView] = useState<AttemptView | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  // Index of the first interviewer line that hasn't finished typing; your own lines are skipped past.
  const [typed, setTyped] = useState(0);

  const [approach, setApproach] = useState("");
  const [language, setLanguage] = useState<CodeLanguage>("javascript");
  const [code, setCode] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);

  const [busy, setBusy] = useState<Phase | "followups" | "hint" | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);

  const [result, setResult] = useState<FinishedResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [levelUp, setLevelUp] = useState<FinishedResult["level_up"]>(null);
  const [flash, setFlash] = useState<"hit" | null>(null);
  const [damage, setDamage] = useState<DamagePop | null>(null);

  const voice = useInterviewerVoice();
  const { say } = voice;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hitCount = useRef(0);
  const started = useRef(false);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  // Your own lines count as already typed.
  useEffect(() => {
    if (transcript[typed]?.speaker === "you") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- advancing past your own lines as the transcript grows
      setTyped((t) => t + 1);
    }
  }, [typed, transcript]);

  const addLine = (line: TranscriptEntry) => setTranscript((t) => [...t, line]);

  const finishWith = useCallback(
    (v: AttemptView, r: FinishedResult, finishedBefore = false) => {
      setResult(r);
      setLevelUp(r.level_up);
      // Toasts are for the moment it happens, not for reopening an old result.
      if (!finishedBefore) {
        for (const a of r.unlocked) {
          showToast({ label: "Achievement unlocked", title: a.name, body: a.description });
        }
      }
      // On a boss, let the last hit land before the result screen covers the arena.
      if (v.level.is_boss && v.phases.length === PHASES.length && !finishedBefore) {
        later(() => setShowResult(true), RESULT_DELAY_BOSS_MS);
      } else {
        setShowResult(true);
      }
    },
    [],
  );

  // ----------------------------------------------------------------- loading
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const res = await fetch(`/api/adventure/attempt?attempt_id=${encodeURIComponent(attemptId)}`);
        if (res.status === 401) return setLoad({ status: "signed_out" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) return setLoad({ status: "error", message: body.error || "Couldn't load this level." });
        const v = body as AttemptView;
        const mode = v.level.is_boss ? "boss" : "normal";

        // Rebuild what was already said: the question, then each scored step's feedback.
        const lines: TranscriptEntry[] = [
          { speaker: "interviewer", text: v.question_text, expression: "neutral", rich: true },
          { speaker: "interviewer", text: PROMPTS[mode].approach, expression: "neutral" },
        ];
        for (const p of v.phases) {
          lines.push({ speaker: "interviewer", text: p.feedback, expression: expressionForScore(p.score) });
        }
        if (v.followups && v.phases.some((p) => p.phase === "code")) {
          for (const q of v.followups) lines.push({ speaker: "interviewer", text: q, expression: "thinking" });
        }
        setTranscript(lines);
        // Lines that were already said before a reload don't need to type out again.
        setTyped(v.phases.length > 0 ? lines.length - 1 : 0);
        setView(v);
        if (v.followups) setAnswers(v.followups.map(() => ""));
        setLoad({ status: "ready" });

        if (v.status !== "in_progress") {
          finishWith(v, storedResult(v), true);
        } else if (v.phases.length === PHASES.length) {
          // Every step was scored but the attempt wasn't closed (the page was left mid-request).
          const fin = await postJson<{ attempt: AttemptView; result: FinishedResult | null }>("/api/adventure/finish", { attempt_id: attemptId });
          setView(fin.attempt);
          finishWith(fin.attempt, fin.result ?? storedResult(fin.attempt));
        } else if (v.phases.length === 0) {
          say(`${v.question_text} ${PROMPTS[mode].approach}`);
        } else if (v.next_phase === "defend" && !v.followups) {
          void fetchFollowups(v);
        }
      } catch {
        setLoad({ status: "error", message: "Couldn't reach the server. Check your connection." });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  // ---------------------------------------------------------------- follow-ups
  async function fetchFollowups(v: AttemptView) {
    setBusy("followups");
    setProblem(null);
    try {
      const { followups } = await postJson<{ followups: string[] }>("/api/adventure/followups", { attempt_id: v.id });
      setView((cur) => (cur ? { ...cur, followups } : cur));
      setAnswers(followups.map(() => ""));
      followups.forEach((q) => addLine({ speaker: "interviewer", text: q, expression: "thinking" }));
      say(followups.join(" "));
    } catch (err) {
      setProblem({
        message: err instanceof Error ? err.message : "Couldn't get the follow-up questions.",
        retry: () => void fetchFollowups(v),
      });
    } finally {
      setBusy(null);
    }
  }

  // ------------------------------------------------------------------ scoring
  function showHit(damageDone: number) {
    hitCount.current += 1;
    setDamage({ amount: damageDone, key: hitCount.current });
    setFlash(damageDone > 0 ? "hit" : null);
    later(() => setFlash(null), HIT_MS);
    later(() => setDamage(null), DAMAGE_MS);
  }

  async function submit(phase: Phase) {
    if (!view || busy) return;
    const payload =
      phase === "approach"
        ? { attempt_id: view.id, phase, approach_text: approach }
        : phase === "code"
          ? { attempt_id: view.id, phase, code, language }
          : { attempt_id: view.id, phase, answers };
    setBusy(phase);
    setProblem(null);
    try {
      const res = await postJson<{
        phase: AttemptView["phases"][number];
        recorded: boolean;
        hp: number;
        next_phase: Phase | null;
        finished: boolean;
        result: FinishedResult | null;
      }>("/api/adventure/phase", payload);

      const mode = view.level.is_boss ? "boss" : "normal";
      if (phase === "approach") addLine({ speaker: "you", text: approach });
      if (phase === "defend") answers.forEach((a) => addLine({ speaker: "you", text: a }));
      addLine({ speaker: "interviewer", text: res.phase.feedback, expression: expressionForScore(res.phase.score) });

      const nextView: AttemptView = {
        ...view,
        phases: view.phases.some((p) => p.phase === phase) ? view.phases : [...view.phases, res.phase],
        hp: res.hp,
        next_phase: res.next_phase,
      };
      setView(nextView);
      if (view.level.is_boss && res.recorded) showHit(res.phase.damage);

      if (phase === "approach") {
        addLine({ speaker: "interviewer", text: PROMPTS[mode].code, expression: "neutral" });
        say(`${res.phase.feedback} ${PROMPTS[mode].code}`);
      } else if (phase === "code") {
        say(res.phase.feedback);
      } else {
        say(res.phase.feedback);
      }

      if (res.finished) {
        // Read the closed attempt back from the server: it knows the next level and the stored scores.
        const fin = await postJson<{ attempt: AttemptView; result: FinishedResult | null }>("/api/adventure/finish", { attempt_id: view.id }).catch(() => null);
        const finalView = fin?.attempt ?? nextView;
        setView(finalView);
        finishWith(finalView, res.result ?? fin?.result ?? storedResult(finalView));
      } else if (phase === "code") {
        void fetchFollowups(nextView);
      }
    } catch (err) {
      const message =
        err instanceof ApiError && err.reason === "ai_failed"
          ? "Scoring didn't work this time. Nothing was counted. Try again."
          : err instanceof Error
            ? err.message
            : "Something went wrong.";
      // A daily-limit or capacity block is shown by the full-screen message instead.
      if (!(err instanceof ApiError && (err.reason === "daily_limit" || err.reason === "capacity"))) {
        setProblem({ message, retry: () => void submit(phase) });
      }
    } finally {
      setBusy(null);
    }
  }

  async function askForHint(phase: Phase) {
    if (!view || busy) return;
    setBusy("hint");
    setProblem(null);
    const draft = phase === "approach" ? approach : phase === "code" ? code : answers.join("\n");
    try {
      const { hint_text } = await postJson<{ hint_text: string; granted: boolean }>("/api/adventure/hint", {
        attempt_id: view.id,
        phase,
        draft: draft.slice(0, ADVENTURE.limits.code) || undefined,
      });
      setView((cur) => (cur && !cur.hints.some((h) => h.phase === phase) ? { ...cur, hints: [...cur.hints, { phase, hint_text }] } : cur));
      say(hint_text);
    } catch (err) {
      if (!(err instanceof ApiError && (err.reason === "daily_limit" || err.reason === "capacity"))) {
        setProblem({ message: err instanceof Error ? err.message : "Couldn't get a hint.", retry: () => void askForHint(phase) });
      }
    } finally {
      setBusy(null);
    }
  }

  // -------------------------------------------------------------------- views
  const shell = (children: React.ReactNode, title = "Level") => (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8 sm:py-10">
      <AppHeader crumbs={CRUMBS(title)} />
      {children}
    </main>
  );

  if (load.status === "loading") {
    return shell(
      <div className="flex flex-col gap-6" role="status" aria-label="Loading the level">
        <SkeletonPanel lines={2} />
        <SkeletonPanel lines={5} />
      </div>,
    );
  }
  if (load.status === "signed_out") {
    return shell(
      <StatusMessage title="Sign in to play" action={<PixelButton onClick={() => signInWithGoogle()}>Sign in with Google</PixelButton>}>
        Adventure saves your progress to your account, so you need to be signed in.
      </StatusMessage>,
    );
  }
  if (load.status === "error" || !view) {
    return shell(
      <StatusMessage title="Couldn't load this level" action={<PixelLink href="/adventure">Back to map</PixelLink>}>
        {load.status === "error" ? load.message : "Something went wrong."}
      </StatusMessage>,
    );
  }

  const boss = view.level.is_boss;
  const mode = boss ? "boss" : "normal";
  const current = view.status === "in_progress" ? view.next_phase : null;
  const scores = Object.fromEntries(view.phases.map((p) => [p.phase, p.score])) as Partial<Record<Phase, number>>;
  const hintUsed = (phase: Phase) => view.hints.find((h) => h.phase === phase)?.hint_text;
  const finished = view.status !== "in_progress" || result !== null;
  const showEditor = current === "code" || current === "defend" || (finished && !showResult && !boss);

  const bossState: GoblinState = finished
    ? result?.passed
      ? "defeated"
      : "angry"
    : flash === "hit"
      ? "hit"
      : damage && damage.amount === 0
        ? "angry"
        : view.hp <= 4
          ? "angry"
          : "idle";

  const hintBox = (phase: Phase) => {
    const text = hintUsed(phase);
    return text ? (
      <div className="border-[3px] border-amber px-3 py-2">
        <p className="font-display text-xs uppercase tracking-widest text-amber">Hint</p>
        <p className="text-base leading-relaxed">{text}</p>
      </div>
    ) : (
      <div>
        <PixelButton variant="ghost" size="sm" onClick={() => askForHint(phase)} disabled={!!busy} title="One hint per step. It nudges, it doesn't give the answer.">
          {busy === "hint" ? "Thinking..." : "Get a hint"}
        </PixelButton>
      </div>
    );
  };

  return shell(
    <>
      {levelUp && result && showResult && (
        <LevelUpDialog level={levelUp.to} previousLevel={levelUp.from} xpEarned={result.xp_gained} onClose={() => setLevelUp(null)} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-[3px] border-paper bg-ink px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-display text-lg uppercase tracking-widest">{boss ? "Boss battle" : `Level ${view.level.order_index}`}</span>
          {!boss && <DifficultyTag difficulty={view.level.difficulty} />}
          <span className="font-display text-xs uppercase tracking-widest text-green">{view.level.topic}</span>
        </div>
        <PhaseTracker labels={PHASE_LABELS[mode]} scores={scores} current={current} />
      </div>

      {boss && (
        <BossArena name={view.level.title} hp={view.hp} total={view.hp_total} state={bossState} difficulty={view.level.difficulty} damage={damage} />
      )}

      {showResult && result ? (
        <ResultScreen view={view} result={result} />
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex w-full flex-col gap-4 lg:w-[420px] lg:shrink-0">
            <VoiceControls voice={voice} />

            <div className="flex flex-col gap-4" aria-live="polite">
              {transcript.map((entry, i) => {
                if (i > typed) return null;
                if (entry.speaker === "you") return <YouLine key={i} text={entry.text} />;
                return (
                  <InterviewerLine key={i} entry={entry} typing={i === typed} onDone={() => setTyped((t) => (t === i ? t + 1 : t))} />
                );
              })}
              {busy && busy !== "hint" && busy !== "followups" && (
                <div className="flex items-start gap-3">
                  <Avatar expression="thinking" />
                  <div className="border-[3px] border-dashed border-paper px-4 py-3">
                    <p className="font-display text-sm uppercase tracking-widest">
                      <span className="blink-cursor">Scoring...</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {!finished && current === "approach" && (
              <div className="flex flex-col gap-3">
                <VoiceTextArea
                  value={approach}
                  onChange={setApproach}
                  placeholder="Describe your approach in your own words, or tap the mic and say it."
                  label="Your approach"
                  rows={5}
                  disabled={busy === "approach"}
                />
                {hintBox("approach")}
                <div>
                  <PixelButton onClick={() => submit("approach")} disabled={!!busy || approach.trim().length < 5}>
                    {busy === "approach" ? "Scoring..." : "Send"}
                  </PixelButton>
                </div>
              </div>
            )}

            {!finished && current === "code" && (
              <div className="flex flex-col gap-3">
                {hintBox("code")}
                {busy === "code" ? (
                  <StepProgress messages={["Reading your code...", "Scoring this step..."]} />
                ) : (
                  <div>
                    <PixelButton onClick={() => submit("code")} disabled={!!busy || code.trim().length < 3}>
                      Submit code
                    </PixelButton>
                  </div>
                )}
              </div>
            )}

            {!finished && current === "defend" && busy === "followups" && <StepProgress messages={["Reading your code...", "Thinking of follow-ups..."]} />}

            {!finished && current === "defend" && view.followups && (
              <div className="flex flex-col gap-4">
                {view.followups.map((_, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <p className="font-display text-xs uppercase tracking-widest text-amber">Answer to follow-up {i + 1}</p>
                    <VoiceTextArea
                      value={answers[i] ?? ""}
                      onChange={(v) => setAnswers((a) => a.map((x, j) => (j === i ? v : x)))}
                      rows={3}
                      disabled={busy === "defend"}
                      label={`Answer to follow-up ${i + 1}`}
                      placeholder="Your answer, or tap the mic and say it."
                    />
                  </div>
                ))}
                {hintBox("defend")}
                {busy === "defend" ? (
                  <StepProgress messages={["Reading your answers...", "Scoring this step...", "Writing feedback..."]} />
                ) : (
                  <div>
                    <PixelButton onClick={() => submit("defend")} disabled={!!busy || answers.length === 0 || answers.some((a) => a.trim().length === 0)}>
                      Submit answers
                    </PixelButton>
                  </div>
                )}
              </div>
            )}

            {finished && !showResult && <StepProgress messages={["Counting the damage..."]} />}

            {problem && (
              <div role="alert" className="flex flex-col gap-3 border-[3px] border-red px-3 py-3 text-base text-red">
                <p>{problem.message}</p>
                {problem.retry && (
                  <div>
                    <PixelButton variant="danger" size="sm" onClick={problem.retry}>
                      Retry
                    </PixelButton>
                  </div>
                )}
              </div>
            )}
          </div>

          {showEditor && (
            <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
              <CodeEditor language={language} onLanguageChange={setLanguage} value={code} onChange={setCode} />
            </div>
          )}
        </div>
      )}
    </>,
    view.level.title,
  );
}
