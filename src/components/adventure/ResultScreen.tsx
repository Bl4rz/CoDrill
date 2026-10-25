"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ADVENTURE, PHASES, PHASE_INFO } from "@/lib/adventure/config";
import type { AttemptView, FinishedResult } from "@/lib/adventure/types";
import { ApiError, postJson } from "@/lib/api-client";
import { GoblinSprite } from "@/components/pixel/GoblinSprite";
import { CoinIcon } from "@/components/pixel/icons";
import { Mascot } from "@/components/pixel/Mascot";
import { PixelButton, PixelLink } from "@/components/pixel/PixelButton";
import { SegmentBar } from "@/components/pixel/SegmentBar";
import { shadowColor } from "@/components/pixel/style";
import { scoreColor } from "@/lib/grade";

/**
 * The end of an attempt. Every number here (scores, XP, coins, unlocks) was stored by the
 * server; this only displays it. Boss victory, level clear, and the two "not yet" screens.
 */
export function ResultScreen({ view, result }: { view: AttemptView; result: FinishedResult }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boss = view.level.is_boss;
  const victory = result.passed && boss;
  const scores = Object.fromEntries(view.phases.map((p) => [p.phase, p.score]));
  const hpLeft = view.hp;

  const title = victory ? "BOSS DEFEATED!" : result.passed ? "LEVEL CLEAR!" : boss ? "NOT YET" : "NOT QUITE";
  const accent = result.passed ? "var(--green)" : "var(--amber)";

  async function retry() {
    setStarting(true);
    setError(null);
    try {
      const { attempt_id } = await postJson<{ attempt_id: string }>("/api/adventure/start", { level_id: view.level.id });
      router.push(`/adventure/play/${attempt_id}`);
    } catch (err) {
      // A daily-limit or capacity block is shown by the full-screen message instead.
      if (!(err instanceof ApiError && (err.reason === "daily_limit" || err.reason === "capacity"))) {
        setError(err instanceof Error ? err.message : "Couldn't start again.");
      }
      setStarting(false);
    }
  }

  return (
    <section
      aria-labelledby="result-title"
      className="pixel-panel mx-auto flex w-full max-w-2xl flex-col gap-6 border-paper bg-ink p-5 sm:p-8"
      style={shadowColor(accent)}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        {boss ? (
          <GoblinSprite state={victory ? "defeated" : "angry"} unit="var(--u)" title={victory ? "The Debug Goblin, defeated" : "The Debug Goblin, still standing"} />
        ) : (
          <Mascot expression={result.passed ? "impressed" : "concerned"} scale={1.25} />
        )}
        <h1 id="result-title" className="pixel-title text-[clamp(1.5rem,7vw,2.5rem)]" style={{ color: accent }}>
          {title}
        </h1>
        <p className="font-display text-base uppercase tracking-widest">
          {view.level.title} <span className="text-green">· score {result.overall}</span>
        </p>
        {boss && !victory && <p className="text-base">The Debug Goblin has {hpLeft} of {view.hp_total} HP left. It is not beaten yet.</p>}
        {!result.passed && (
          <p className="max-w-md text-base leading-relaxed">
            {boss
              ? "Nothing is lost. Read the feedback below, then try again with a fresh exercise. To win you have to take all 10 HP, so every step needs to go well."
              : `Nothing is lost. Read the feedback below, then try again with a fresh question. Pass mark is ${ADVENTURE.passThreshold}${
                  ADVENTURE.fairnessMargin > 0 ? ` (scores within ${ADVENTURE.fairnessMargin} of it count)` : ""
                }.`}
          </p>
        )}
        {victory && <p className="max-w-md text-base leading-relaxed">Syntax Valley is cleared.</p>}
      </div>

      {result.passed && (
        <div className="border-[3px] border-paper px-4 py-3" aria-label="Rewards">
          {result.xp_gained > 0 || result.coins_gained > 0 ? (
            <p className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 font-display text-xl uppercase tracking-widest">
              <span className="text-green">+{result.xp_gained} XP</span>
              {result.coins_gained > 0 && (
                <span className="flex items-center gap-1 text-amber">
                  <CoinIcon /> +{result.coins_gained}
                </span>
              )}
            </p>
          ) : (
            <p className="text-center text-base">You had already cleared this one, so there is no XP or coins this time.</p>
          )}
        </div>
      )}

      {result.unlocked.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-display text-sm uppercase tracking-widest text-amber">Achievements unlocked</p>
          <ul className="flex flex-col gap-2">
            {result.unlocked.map((a) => (
              <li key={a.id} className="border-[3px] border-amber px-3 py-2">
                <span className="font-display text-base uppercase tracking-widest">{a.name}</span>
                <span className="block text-sm">{a.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {PHASES.map((phase, i) => (
          <SegmentBar key={phase} label={PHASE_INFO[phase].skill} value={scores[phase] ?? 0} animate delay={i * 900} />
        ))}
      </div>

      <details className="group border-[3px] border-paper">
        <summary className="cursor-pointer px-4 py-3 font-display text-sm uppercase tracking-widest focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber">
          Detailed feedback
        </summary>
        <div className="flex flex-col gap-4 border-t-[3px] border-paper p-4">
          {view.phases.map((p) => (
            <div key={p.phase} className="flex flex-col gap-1">
              <p className="flex flex-wrap items-baseline justify-between gap-2 font-display text-sm uppercase tracking-widest">
                <span>{PHASE_INFO[p.phase].title}</span>
                <span style={{ color: scoreColor(p.score) }}>{p.score}</span>
              </p>
              <p className="whitespace-pre-wrap text-base leading-relaxed">{p.feedback}</p>
            </div>
          ))}
        </div>
      </details>

      {error && (
        <p role="alert" className="border-[3px] border-red px-3 py-2 text-base text-red">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {result.passed && view.next_level_id && (
          <PixelLink href={`/adventure?level=${view.next_level_id}`}>Next</PixelLink>
        )}
        <PixelButton variant={result.passed ? "ghost" : "primary"} onClick={retry} disabled={starting}>
          {starting ? "Starting..." : boss && !victory ? "Try again" : "Retry"}
        </PixelButton>
        <PixelLink href="/adventure" variant="ghost">
          Back to map
        </PixelLink>
      </div>
      <p className="text-center text-sm">Starting again uses one of today&apos;s runs.</p>
    </section>
  );
}
