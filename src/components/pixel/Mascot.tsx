import { Sprite, type SpriteColors } from "@/components/pixel/Sprite";

export type Expression = "neutral" | "blink" | "thinking" | "impressed" | "concerned";

// B body, D screen, A amber (eyes, mouth, antenna tip, drill), S paper (antenna
// stem, boots, drill tip). The screen is the 6x4 block at columns 5-10, rows 4-7;
// each expression only swaps those four rows.
const FACES: Record<Expression, readonly string[]> = {
  neutral: ["DDDDDD", "DADDAD", "DDDDDD", "DDAADD"],
  blink: ["DDDDDD", "DDDDDD", "DDDDDD", "DDAADD"],
  thinking: ["DDDDDD", "DDADDA", "DDDDDD", "DDDDAD"],
  impressed: ["AADAAD", "AADAAD", "DADDAD", "DDAADD"],
  concerned: ["DDAADD", "DADDAD", "DDAADD", "DADDAD"],
};

const BODY_TOP = [".......AA.......", ".......SS.......", "...BBBBBBBBBB...", "...BBBBBBBBBB..."];
const BODY_MID = ["...BBBBBBBBBB...", "....BBBBBBBB....", "......BBBB......"];
const BODY_LOW = [
  ".BBBBBBBBBBBBBB.",
  "BBBBBBBBBBBBBBBB",
  "BBBBBBBAABBBBBBB",
  "BBBBBBBAABBBBBBB",
  "BBBBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBBAA",
  ".B.BBBBBBBBBBAS.",
  "....BBB..BBB....",
  "....BBB..BBB....",
  "....SSS..SSS....",
];

export const MASCOT_COLORS: SpriteColors = {
  B: "var(--green)",
  D: "var(--ink)",
  A: "var(--amber)",
  S: "var(--paper)",
};

export function mascotRows(expression: Expression, crop: "full" | "head" = "full"): string[] {
  const screen = FACES[expression].map((face) => `...BB${face}BB...`);
  const head = [...BODY_TOP, ...screen, ...BODY_MID];
  return crop === "head" ? head.slice(0, 10) : [...head, ...BODY_LOW];
}

export function Mascot({
  expression = "neutral",
  crop = "full",
  scale = 1,
  unit,
  className,
  title = "Codrill's mascot, a small pixel robot with a drill hand",
}: {
  expression?: Expression;
  crop?: "full" | "head";
  scale?: number;
  unit?: string;
  className?: string;
  title?: string;
}) {
  return (
    <Sprite
      rows={mascotRows(expression, crop)}
      colors={MASCOT_COLORS}
      scale={scale}
      unit={unit}
      className={className}
      title={title}
    />
  );
}
