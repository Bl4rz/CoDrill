import { PALETTE } from "@/lib/palette";
import { mascotRows, MASCOT_COLORS } from "@/components/pixel/Mascot";
import { spritePaths, type SpriteColors } from "@/components/pixel/Sprite";
import {
  BENCH,
  BENCH_COLORS,
  HORIZON_BANDS,
  HORIZON_CLOUDS,
  HORIZON_CLOUD_COLORS,
  OFFICE,
  OFFICE_COLORS,
  TREE,
  TREE_COLORS,
} from "@/components/landing/scenery";
import { pixelTextRows } from "@/lib/pixelFont";

// Same art as the title screen, rendered as plain SVG with real hex colors
// (the OG image renderer can't read CSS variables).

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const DENSITY: Record<string, number> = { d1: 1, d2: 2, d4: 4, d8: 8, d12: 12 };

export const OG_W = 1200;
export const OG_H = 630;
export const U = 10; // one art pixel, in image pixels
const COLS = OG_W / U;
const GROUND = 6;

const hex = (cssVar: string) => {
  const name = cssVar.replace("var(--", "").replace(")", "") as keyof typeof PALETTE;
  return PALETTE[name];
};

export interface Piece {
  fill: string;
  d: string;
}

function cell(x: number, y: number, size = U) {
  return `M${x} ${y}h${size}v${size}h-${size}z`;
}

function sprite(rows: readonly string[], colors: SpriteColors, x: number, y: number, unit: number): Piece[] {
  return spritePaths(rows, colors).map(({ color, d }) => ({
    fill: hex(color),
    d: d.replace(/([Mhv])(-?[\d.]+)(?: (-?[\d.]+))?/g, (_m, cmd: string, a: string, b?: string) => {
      const n = (v: string) => Number(v) * unit;
      if (cmd === "M") return `M${n(a) + x} ${n(b!) + y}`;
      return `${cmd}${n(a)}`;
    }),
  }));
}

function bands(): Piece[] {
  const pieces: Piece[] = [];
  let artY = (OG_H - GROUND * U) / U; // top of the ground, in art pixels
  for (const band of HORIZON_BANDS) {
    artY -= band.h;
    const fill = hex(band.color);
    if (!band.dither) {
      pieces.push({ fill, d: `M0 ${artY * U}h${OG_W}v${band.h * U}h-${OG_W}z` });
      continue;
    }
    let d = "";
    const density = DENSITY[band.dither];
    for (let y = 0; y < band.h; y++) {
      for (let x = 0; x < COLS; x++) {
        if (BAYER[(artY + y) % 4][x % 4] < density) d += cell(x * U, (artY + y) * U);
      }
    }
    pieces.push({ fill, d });
  }
  return pieces;
}

export function ogPieces(): Piece[] {
  const groundTop = OG_H - GROUND * U;
  const pieces: Piece[] = [];

  pieces.push(...bands());

  // stars
  const stars = [
    [90, 70], [1110, 60], [60, 150], [1140, 170], [40, 215], [1160, 215], [300, 208], [900, 206],
  ];
  pieces.push({ fill: PALETTE.paper, d: stars.map(([x, y]) => cell(x, y)).join("") });

  // horizon cloud silhouettes
  pieces.push(...sprite(HORIZON_CLOUDS[0], HORIZON_CLOUD_COLORS, 120, groundTop - 14 * U, U));
  pieces.push(...sprite(HORIZON_CLOUDS[2], HORIZON_CLOUD_COLORS, 930, groundTop - 17 * U, U));

  // scenery, standing on the ground line
  const mascot = mascotRows("neutral");
  const mu = 14;
  const mw = 16 * mu;
  const mx = (OG_W - mw) / 2;
  const my = groundTop - mascot.length * mu;
  pieces.push(...sprite(TREE, TREE_COLORS, mx - 30 - 13 * U - 13 * U, groundTop - TREE.length * U, U));
  pieces.push(...sprite(BENCH, BENCH_COLORS, mx - 30 - 13 * U, groundTop - BENCH.length * U, U));
  pieces.push(...sprite(OFFICE, OFFICE_COLORS, mx + mw + 40, groundTop - OFFICE.length * U, U));
  pieces.push(...sprite(mascot, MASCOT_COLORS, mx, my, mu));

  // ground
  pieces.push({ fill: PALETTE.green, d: `M0 ${groundTop}h${OG_W}v${U}h-${OG_W}z` });
  pieces.push({ fill: PALETTE.ink, d: `M0 ${groundTop + U}h${OG_W}v${OG_H - groundTop - U}h-${OG_W}z` });

  // title: amber offset copy first, then paper on top
  const title = pixelTextRows("CODRILL");
  const tu = 20;
  const tw = title[0].length * tu;
  const tx = (OG_W - tw) / 2;
  const ty = 48;
  const solid = (c: string) => ({ X: c }) as SpriteColors;
  pieces.push(...sprite(title, solid(`var(--amber)`), tx + 8, ty + 8, tu));
  pieces.push(...sprite(title, solid(`var(--paper)`), tx, ty, tu));

  // tagline
  const tag = pixelTextRows("FREE MOCK INTERVIEWS FOR THE JOB YOU WANT.");
  const gu = 4;
  const gw = tag[0].length * gu;
  pieces.push(...sprite(tag, solid(`var(--green)`), (OG_W - gw) / 2, ty + 7 * tu + 44, gu));

  return pieces;
}
