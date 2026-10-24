// The only place a hex color is allowed to live. Five colors, flat, no tints.
// layout.tsx injects these as CSS variables on <html>; everything else (Tailwind
// tokens, sprites, Monaco's theme, the OG image) reads them from here or from
// those variables.
export const PALETTE = {
  ink: "#0a1410",
  paper: "#f3ecd2",
  green: "#4ade80",
  amber: "#f5a623",
  red: "#ef4f5b",
} as const;

export type PaletteName = keyof typeof PALETTE;

export const PALETTE_CSS_VARS = Object.fromEntries(
  Object.entries(PALETTE).map(([name, hex]) => [`--${name}`, hex]),
) as Record<string, string>;
