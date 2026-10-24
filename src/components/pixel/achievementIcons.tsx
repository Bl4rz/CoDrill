import { Sprite, type SpriteColors } from "@/components/pixel/Sprite";
import { LockIcon } from "@/components/pixel/icons";

// 12x12 grids, one character per art pixel. X is the main color, G the second.
const ICONS: Record<string, readonly string[]> = {
  first_run: [
    ".X..........",
    ".XXXXXX.....",
    ".XXXXXXXX...",
    ".XXXXXXXXXX.",
    ".XXXXXXXX...",
    ".XXXXXX.....",
    ".X..........",
    ".X..........",
    ".X..........",
    ".X..........",
    ".X..........",
    "XXXX........",
  ],
  three_down: [
    "............",
    ".XXXXXXXXXX.",
    ".XXXXXXXXXX.",
    ".........XX.",
    "......XXXXX.",
    "......XXXXX.",
    ".........XX.",
    ".........XX.",
    ".XXXXXXXXXX.",
    ".XXXXXXXXXX.",
    "............",
    "............",
  ],
  clean_explainer: [
    "............",
    ".XXXXXXXXXX.",
    ".XXXXXXXXXX.",
    ".X.XXXXXX.X.",
    ".XXXXXXXXXX.",
    ".X.XXXX.XXX.",
    ".XXXXXXXXXX.",
    "..XXX.......",
    "...XX.......",
    "....X.......",
    "............",
    "............",
  ],
  speed_thinker: [
    "......XXXX..",
    ".....XXXX...",
    "....XXXX....",
    "...XXXXXXX..",
    ".....XXXX...",
    "....XXXX....",
    "...XXX......",
    "..XX........",
    "..X.........",
    "............",
    "............",
    "............",
  ],
  polyglot: [
    "XXXXXXX.....",
    "XXXXXXX.....",
    "XXXXXXX.....",
    "XXXGGGGGGG..",
    "XXXGGGGGGG..",
    "XXXGGGGGGG..",
    "...GGGGGGG..",
    "...GGGGGGG..",
    "...GGGGGGG..",
    "............",
    "............",
    "............",
  ],
  level_5: [
    ".....X......",
    ".....X......",
    "....XXX.....",
    "XXXXXXXXXXX.",
    ".XXXXXXXXX..",
    "..XXXXXXX...",
    "..XXXXXXX...",
    ".XXXX.XXXX..",
    ".XXX...XXX..",
    "XX.......XX.",
    "............",
    "............",
  ],
};

const UNLOCKED: SpriteColors = { X: "var(--amber)", G: "var(--green)" };

/** A pixel icon for an achievement. Locked ones show a padlock instead. */
export function AchievementIcon({ id, unlocked, unit = "4px" }: { id: string; unlocked: boolean; unit?: string }) {
  if (!unlocked) {
    return (
      <span className="flex h-12 w-12 items-center justify-center text-paper" aria-hidden="true">
        <LockIcon unit="3px" />
      </span>
    );
  }
  return (
    <span className="flex h-12 w-12 items-center justify-center" aria-hidden="true">
      <Sprite rows={ICONS[id] ?? ICONS.first_run} colors={UNLOCKED} unit={unit} />
    </span>
  );
}
