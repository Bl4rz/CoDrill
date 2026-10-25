import { Sprite, type SpriteColors } from "@/components/pixel/Sprite";

export type GoblinState = "idle" | "hit" | "angry" | "defeated";

// R skin, A amber (eyes, tongue, sweat), K ink (pupils, mouth, brows), P paper (teeth).
// 16x16, one character per art pixel.
const BODY_LOW = [
  "...RRRRRRRRRR...",
  "..RRRRRRRRRRRR..",
  "..RRR.RRRR.RRR..",
  "..RR..RRRR..RR..",
  "..KK..KKKK..KK..",
];

const BODY_LOW_DEFEATED = [
  "...RRRRRRRRRR...",
  "..RRRRRRRRRRRR..",
  "..RRRR....RRRR..",
  "..RRR......RRR..",
  "..KKK......KKK..",
];

const HEAD: Record<GoblinState, readonly string[]> = {
  idle: [
    ".R............R.",
    ".RR..........RR.",
    "..RR.RRRRRR.RR..",
    "..RRRRRRRRRRRR..",
    "...RRRRRRRRRR...",
    "...RAAKRRKAAR...",
    "...RAAKRRKAAR...",
    "...RRRRRRRRRR...",
    "...RKKKKKKKKR...",
    "...RPKPKPKPKR...",
    "....RRRRRRRR....",
  ],
  hit: [
    ".R............R.",
    ".RR..........RR.",
    "..RR.RRRRRR.RR..",
    "..RRRRRRRRRRRR..",
    "...RRRRRRRRRA...",
    "...RKKKRRKKKR...",
    "...RRKRRRRKRR...",
    "...RRRRRRRRRR...",
    "...RKKKKKKKKR...",
    "...RKKKKKKKKR...",
    "....RRRRRRRR....",
  ],
  angry: [
    ".R............R.",
    ".RR..........RR.",
    "..RR.RRRRRR.RR..",
    "..RRRRRRRRRRRR..",
    "...RKKRRRRKKR...",
    "...RAAKRRKAAR...",
    "...RRAARRAARR...",
    "...RRRRRRRRRR...",
    "...RKKKKKKKKR...",
    "...RPPPPPPPPR...",
    "....RRRRRRRR....",
  ],
  defeated: [
    ".R............R.",
    ".RR..........RR.",
    "..RR.RRRRRR.RR..",
    "..RRRRRRRRRRRR..",
    "...RRRRRRRRRR...",
    "...RKRKRRKRKR...",
    "...RRKRRRRKRR...",
    "...RRRRRRRRRR...",
    "...RRRKKKKRRR...",
    "...RRRRAARRRR...",
    "....RRRRRRRR....",
  ],
};

export const GOBLIN_COLORS: SpriteColors = {
  R: "var(--red)",
  A: "var(--amber)",
  K: "var(--ink)",
  P: "var(--paper)",
};

export function goblinRows(state: GoblinState, crop: "full" | "head" = "full"): string[] {
  const head = [...HEAD[state]];
  if (crop === "head") return head;
  return [...head, ...(state === "defeated" ? BODY_LOW_DEFEATED : BODY_LOW)];
}

/** The Debug Goblin. Four states: idle, hit, angry, defeated. */
export function GoblinSprite({
  state = "idle",
  crop = "full",
  scale = 1,
  unit,
  className,
  title = "The Debug Goblin, a small red pixel monster",
}: {
  state?: GoblinState;
  crop?: "full" | "head";
  scale?: number;
  unit?: string;
  className?: string;
  title?: string;
}) {
  return (
    <Sprite
      rows={goblinRows(state, crop)}
      colors={GOBLIN_COLORS}
      scale={scale}
      unit={unit}
      className={className}
      title={title}
    />
  );
}
