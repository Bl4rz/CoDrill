"use client";

import { CheckIcon, CoinIcon } from "@/components/pixel/icons";
import { PixelButton } from "@/components/pixel/PixelButton";
import type { QuestView } from "@/lib/progression/types";

function Chunks({ progress, target }: { progress: number; target: number }) {
  return (
    <div className="flex gap-[3px]" role="meter" aria-valuemin={0} aria-valuemax={target} aria-valuenow={progress} aria-label="Quest progress">
      {Array.from({ length: target }).map((_, i) => (
        <div key={i} className="h-3 min-w-6 flex-1 border-2 border-paper" style={{ background: i < progress ? "var(--green)" : "var(--ink)" }} />
      ))}
    </div>
  );
}

/** Three quests for today. CLAIM asks the server, which re-checks the stored results before paying. */
export function QuestList({
  quests,
  claiming,
  error,
  onClaim,
}: {
  quests: QuestView[];
  claiming: string | null;
  error: string | null;
  onClaim: (questId: string) => void;
}) {
  return (
    <section aria-labelledby="quests-title" className="flex flex-col gap-4">
      <div>
        <h2 id="quests-title" className="pixel-heading text-xl">
          Daily quests
        </h2>
        <p className="mt-1 text-base">New ones every day at your midnight. Skipping a day costs nothing.</p>
      </div>
      {error && (
        <p role="alert" className="border-[3px] border-red px-3 py-2 text-base text-red">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {quests.map((q) => (
          <li key={q.id} className="flex flex-col gap-3 border-[3px] border-paper p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-base font-medium">{q.title}</p>
              <p className="shrink-0 font-display text-sm uppercase tracking-widest text-amber">
                {q.progress}/{q.target}
              </p>
            </div>
            <Chunks progress={q.progress} target={q.target} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 font-display text-sm uppercase tracking-widest">
                +{q.xp} XP
                <span className="flex items-center gap-1 text-amber">
                  <CoinIcon /> +{q.coins}
                </span>
              </p>
              {q.claimed ? (
                <span className="flex items-center gap-2 font-display text-sm uppercase tracking-widest text-green">
                  <CheckIcon /> Claimed
                </span>
              ) : (
                <PixelButton
                  size="sm"
                  variant="amber"
                  disabled={!q.completed || claiming !== null}
                  onClick={() => onClaim(q.id)}
                  aria-label={q.completed ? `Claim ${q.title}` : `${q.title}: not finished yet`}
                >
                  {claiming === q.id ? "Claiming..." : "Claim"}
                </PixelButton>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
