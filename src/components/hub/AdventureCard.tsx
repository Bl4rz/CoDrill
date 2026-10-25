import { GoblinSprite } from "@/components/pixel/GoblinSprite";
import { PixelLink } from "@/components/pixel/PixelButton";
import { shadowColor } from "@/components/pixel/style";
import type { HubAdventure } from "@/lib/adventure/types";

/** World progress and the next recommended level, from the player's stored progress. */
export function AdventureCard({ adventure }: { adventure: HubAdventure }) {
  const { completed_count: done, total_count: total, next_level: next } = adventure;
  return (
    <section
      aria-labelledby="adventure-title"
      className="pixel-panel flex flex-col gap-4 border-paper bg-ink p-5"
      style={shadowColor("var(--amber)")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="adventure-title" className="pixel-heading text-xl">
            Adventure
          </h2>
          <p className="mt-1 font-display text-sm uppercase tracking-widest text-green">
            {adventure.world_title} · {done}/{total} cleared
          </p>
        </div>
        <div className="shrink-0">
          <GoblinSprite state={adventure.world_complete ? "defeated" : "idle"} crop="head" unit="3px" title="" />
        </div>
      </div>

      <div className="flex gap-[3px]" role="meter" aria-label="World progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="h-3 flex-1 border-2 border-paper" style={{ background: i < done ? "var(--green)" : "var(--ink)" }} />
        ))}
      </div>

      {next ? (
        <>
          <p className="text-base">
            Next up: {next.is_boss ? "the boss, " : `level ${next.order_index}, `}
            <span className="font-medium">{next.title}</span>.
          </p>
          <PixelLink href={`/adventure?level=${encodeURIComponent(next.id)}`} className="w-full sm:w-fit">
            {done === 0 ? "Start adventure" : "Continue adventure"}
          </PixelLink>
        </>
      ) : (
        <>
          <p className="text-base">You cleared {adventure.world_title}. More worlds coming.</p>
          <PixelLink href="/adventure" variant="ghost" className="w-full sm:w-fit">
            Open the map
          </PixelLink>
        </>
      )}
    </section>
  );
}
