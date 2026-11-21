// The boss arena backdrop: a night sky, moon and grass strip behind the goblin.
import { Layer, bay, clamp, C, mix, rng } from "./toolkit.mjs";

export const ARENA_W = 96;
export const ARENA_H = 72;
/** Where the goblin sprite's top-left sits inside the arena, in art pixels. */
export const GOBLIN_AT = { x: 12, y: -3 };

export function arena() {
  const W = ARENA_W;
  const H = ARENA_H;
  const L = new Layer(W, H);
  const stops = [[0, "#0a1a2c"], [0.5, "#172a47"], [0.85, "#3b2a52"], [1, "#5a3560"]].map((s) => [s[0], C(s[1])]);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const tt = y / 52;
      let i = 0;
      while (i < 2 && tt > stops[i + 1][0]) i++;
      let f = (tt - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
      f = clamp((f - 0.5) * 2.6 + 0.5, 0, 1);
      L.d[y * W + x] = f > bay(x, y) ? stops[i + 1][1] : stops[i][1];
    }
  }
  const r = rng(5);
  for (let i = 0; i < 26; i++) L.set(Math.floor(r() * W), Math.floor(r() * 36), C("#fff1d0"));
  for (let y = -7; y <= 7; y++) {
    for (let x = -7; x <= 7; x++) {
      if (x * x + y * y <= 36) {
        const l = ((x * 0.6 - y * 0.8) / 7) * 0.5 + 0.5;
        L.set(78 + x, 12 + y, l > 0.55 ? C("#fff1d0") : l > 0.3 ? C("#ecd8aa") : C("#cdb88a"));
      }
    }
  }
  const gy = 58;
  for (let x = 0; x < W; x++) {
    const top = gy + Math.round(Math.sin(x * 0.2) * 1);
    for (let y = top; y < H; y++) {
      const d = y - top;
      const k = d < 1 ? "#3fae6e" : d < 3 + (bay(x, y) > 0.5 ? 1 : 0) ? "#2a8160" : d < 9 ? "#1d5f55" : "#12403f";
      L.set(x, y, C(k));
    }
  }
  // the goblin's shadow
  for (let y = 62; y < 70; y++) {
    for (let x = 20; x < 76; x++) {
      const dx = (x - 46) / 26;
      const dy = (y - 65) / 4;
      if (dx * dx + dy * dy < 1) L.set(x, y, mix(L.get(x, y), C("#050e14"), 0.55));
    }
  }
  return L;
}
