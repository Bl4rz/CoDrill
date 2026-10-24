import type { SpriteColors } from "@/components/pixel/Sprite";

// Every sprite is a character grid; one character is one art pixel.

// G foliage, g leaf shade (ink), T trunk
export const TREE = [
  "....GGGGG....",
  "..GGGGGGGGG..",
  ".GGGgGGGGgGG.",
  ".GGGGGGGGGGG.",
  "GGGGgGGGGGgGG",
  "GGGGGGGGGGGGG",
  "GGgGGGGgGGGGG",
  ".GGGGGGGGGGG.",
  ".GGGgGGGGgGG.",
  "..GGGGGGGGG..",
  "...GGGGGGG...",
  ".....TT......",
  ".....TT......",
  ".....TT......",
  "....TTTT.....",
];
export const TREE_COLORS: SpriteColors = {
  G: "var(--green)",
  g: "var(--ink)",
  T: "var(--amber)",
};

// A backrest, seat and legs
export const BENCH = [
  "AAAAAAAAAAAAA",
  ".S.........S.",
  "AAAAAAAAAAAAA",
  ".S.........S.",
  ".S.........S.",
  "SS.........SS",
];
export const BENCH_COLORS: SpriteColors = { A: "var(--amber)", S: "var(--paper)" };

// Office tower, built from a window map so the lit pattern is easy to change.
// P outline, K wall, A lit window
function office(): string[] {
  const W = 18;
  const H = 29;
  const grid: string[][] = Array.from({ length: H }, () => Array<string>(W).fill("."));
  for (let y = 4; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const edge = x === 0 || x === W - 1 || y === 4 || y === H - 1;
      grid[y][x] = edge ? "P" : "K";
    }
  }
  // roof step and antenna
  for (let x = 3; x < W - 3; x++) grid[3][x] = "P";
  for (let y = 0; y < 3; y++) grid[y][8] = "P";
  grid[0][8] = "A";
  // windows: 5 across, 7 down, 2x2 each
  const lit = (r: number, c: number) => (r * 7 + c * 3) % 5 < 2;
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 5; c++) {
      if (!lit(r, c)) continue;
      const x = 2 + c * 3;
      const y = 6 + r * 3;
      grid[y][x] = grid[y][x + 1] = grid[y + 1][x] = grid[y + 1][x + 1] = "A";
    }
  }
  // door
  for (let y = H - 5; y < H - 1; y++) for (let x = 7; x < 11; x++) grid[y][x] = "A";
  return grid.map((row) => row.join(""));
}
export const OFFICE = office();
export const OFFICE_COLORS: SpriteColors = {
  P: "var(--paper)",
  K: "var(--ink)",
  A: "var(--amber)",
};

const CLOUD_SHAPES = [
  [
    ".....XXXX.........",
    "...XXXXXXXX.......",
    ".XXXXXXXXXXXXXX...",
    "XXXXXXXXXXXXXXXXX.",
    ".XXXXXXXXXXXXXXXX.",
  ],
  [
    "......XXX.......",
    "..XXXXXXXXXX....",
    "XXXXXXXXXXXXXXX.",
    ".XXXXXXXXXXXXXX.",
  ],
  [
    "....XXXXX.........",
    "..XXXXXXXXXXX.....",
    ".XXXXXXXXXXXXXXXX.",
    "XXXXXXXXXXXXXXXXXX",
    ".XXXXXXXXXXXXXXXX.",
  ],
];

/** Fill every X with `fill`, but paint X cells that touch empty space with `edge`. */
function cloud(shape: string[], fill: string, edge: string): string[] {
  const at = (x: number, y: number) => shape[y]?.[x] === "X";
  return shape.map((row, y) =>
    row
      .split("")
      .map((ch, x) => {
        if (ch !== "X") return ".";
        const open = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
        return open ? edge : fill;
      })
      .join(""),
  );
}

// High clouds: ink body, green outline, so they read against the dark sky.
export const SKY_CLOUDS = CLOUD_SHAPES.map((s) => cloud(s, "K", "G"));
export const SKY_CLOUD_COLORS: SpriteColors = { K: "var(--ink)", G: "var(--green)" };
// Horizon clouds: solid ink silhouettes against the dithered bands.
export const HORIZON_CLOUDS = CLOUD_SHAPES.map((s) => cloud(s, "K", "K"));
export const HORIZON_CLOUD_COLORS: SpriteColors = { K: "var(--ink)" };

// left %, top %, kind (1 = dot, 3 = plus), blink group
export const STARS: [number, number, 1 | 3, "a" | "b"][] = [
  [6, 8, 1, "a"],
  [14, 20, 3, "b"],
  [22, 6, 1, "b"],
  [31, 14, 1, "a"],
  [41, 5, 3, "a"],
  [58, 9, 1, "b"],
  [66, 17, 1, "a"],
  [74, 6, 3, "b"],
  [83, 13, 1, "a"],
  [91, 7, 1, "b"],
  [95, 22, 3, "a"],
  [9, 33, 1, "a"],
  [88, 34, 1, "b"],
  [48, 24, 1, "b"],
];

// bottom-up bands above the ground: color, dither class, height in art pixels
export const HORIZON_BANDS: { color: string; dither: string; h: number }[] = [
  { color: "var(--amber)", dither: "", h: 1 },
  { color: "var(--amber)", dither: "d12", h: 2 },
  { color: "var(--amber)", dither: "d8", h: 3 },
  { color: "var(--amber)", dither: "d4", h: 3 },
  { color: "var(--green)", dither: "d8", h: 4 },
  { color: "var(--green)", dither: "d4", h: 5 },
  { color: "var(--green)", dither: "d2", h: 6 },
  { color: "var(--green)", dither: "d1", h: 8 },
];
