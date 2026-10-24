import { Mascot } from "@/components/pixel/Mascot";
import { XpBar } from "@/components/pixel/XpBar";
import { CoinIcon } from "@/components/pixel/icons";
import { shadowColor } from "@/components/pixel/style";
import type { PlayerSummary } from "@/lib/progression/types";

/** Avatar, level, XP bar and coins. Every number comes from the server. */
export function PlayerCard({ player }: { player: PlayerSummary }) {
  return (
    <section
      aria-label="Player"
      className="pixel-panel flex flex-col gap-4 border-paper bg-ink p-5 sm:flex-row sm:items-center sm:gap-6"
      style={shadowColor("var(--green)")}
    >
      <div className="flex items-center gap-4 sm:flex-col sm:items-center">
        <div className="shrink-0 border-[3px] border-paper p-2">
          <Mascot crop="head" scale={1.5} unit="4px" title="Your mascot" />
        </div>
        <div className="sm:text-center">
          <p className="font-display text-sm uppercase tracking-widest text-green">Level</p>
          <p className="font-display text-5xl leading-none">{player.level}</p>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <XpBar player={player} />
        <p className="flex items-center gap-2 font-display text-lg uppercase tracking-widest text-amber">
          <CoinIcon unit="3px" />
          <span>{player.coins} coins</span>
        </p>
      </div>
    </section>
  );
}
