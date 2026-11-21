// The only place a UI hex color is allowed to live. Five brand colors (ink,
// paper, green, amber, red) plus the surface, line and bevel tones that go with
// them. layout.tsx injects these as CSS variables on <html> (camelCase keys
// become kebab-case: amberD -> --amber-d, ink2 -> --ink-2); Tailwind tokens,
// Monaco's theme and the OG image read them from here or from those variables.
//
// Sprite shading ramps (5-6 steps, hue-shifted) are NOT here. They live in
// scripts/art/ and are baked into images at build time.
export const PALETTE = {
  // ink: page background. ink2/ink3: panel and inset surfaces. line: 3px borders.
  ink: "#06141c",
  ink2: "#0b222c",
  ink3: "#12333f",
  line: "#215a5e",
  // paper is the cream used for text and dialogs; mute is secondary text.
  paper: "#fff1d0",
  mute: "#a6c0ba",
  // green is the mint accent. D and L are the bevel shadow and highlight.
  green: "#7ff0a8",
  greenD: "#2fa56b",
  greenL: "#d6ffe2",
  amber: "#ffb347",
  amberD: "#c9751f",
  amberL: "#ffd89a",
  red: "#e8604a",
  redD: "#a5382f",
  redL: "#ff9a85",
  // hard offset shadow under panels and buttons
  shade: "#030a10",
} as const;

export type PaletteName = keyof typeof PALETTE;

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/(\d)/, "-$1");

export const PALETTE_CSS_VARS = Object.fromEntries(
  Object.entries(PALETTE).map(([name, hex]) => [`--${kebab(name)}`, hex]),
) as Record<string, string>;
