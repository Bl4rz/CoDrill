// The Debug Goblin. Four states: idle (2-frame bob), hit (white flash),
// angry (low boss HP), defeated (X eyes, slumped, tongue out).
import { Layer, shade, poly, outline, mix, C } from "./toolkit.mjs";
import { A, G, Rg, Y, DK, GOB } from "./palettes.mjs";

export const GOBLIN_W = 72;
export const GOBLIN_H = 66;
export const GOBLIN_STATES = ["idle0", "idle1", "hit", "angry0", "angry1", "defeated"];

export function goblin({ bob = 0, hit = false, mood = "idle" } = {}) {
  const L = new Layer(GOBLIN_W, GOBLIN_H);
  const dead = mood === "defeated";
  const angry = mood === "angry";
  const dy = dead ? 7 : 0; // slumped
  const body = (fn) => fn(dy);

  // ears: droop when defeated
  if (dead) {
    poly(L, [[17, 26 + dy], [17, 38 + dy], [2, 40 + dy]], Rg);
    poly(L, [[55, 26 + dy], [55, 38 + dy], [70, 40 + dy]], Rg);
  } else {
    poly(L, [[17, 22], [17, 34], [1, 17]], Rg);
    poly(L, [[55, 22], [55, 34], [71, 17]], Rg);
    poly(L, [[14, 22], [17, 24], [17, 31]], Rg.slice(3));
  }
  body((d) => {
    shade(L, 25, 38 + d, 22, 19, 5, Rg);
    L.rect(25, 46 + d, 22, 3, C("#3b2237"));
    L.rect(33, 46 + d, 6, 3, A[2]);
    shade(L, 26, 56 + d, 8, 7, 2, Rg.slice(1));
    shade(L, 38, 56 + d, 8, 7, 2, Rg.slice(1));
    shade(L, 17, 40 + d, 8, 14, 3, Rg);
    shade(L, 47, 40 + d, 8, 14, 3, Rg);
  });
  if (!dead) {
    // the bug it carries
    const K = C("#162235");
    L.rect(52, 53, 9, 5, K);
    L.rect(53, 52, 7, 1, K);
    L.set(54, 54, G[1]);
    L.set(58, 54, G[1]);
    L.set(56, 56, G[2]);
    [[51, 52], [51, 55], [51, 58], [61, 52], [61, 55], [61, 58], [54, 51], [58, 51], [53, 50], [59, 50]].forEach((p) => L.set(p[0], p[1], K));
  }

  const hy = 10 + bob + dy;
  shade(L, 17, hy, 38, 30, 9, Rg);
  const ey = 21 + bob + dy;
  [23, 41].forEach((x) => {
    shade(L, x, ey, 9, 7, 2, Y, { amp: 0.3 });
    if (dead) {
      // X eyes
      for (let i = 0; i < 5; i++) {
        L.set(x + 2 + i, ey + 1 + i, DK[1]);
        L.set(x + 6 - i, ey + 1 + i, DK[1]);
      }
    } else {
      L.rect(x + 3, ey + 1, 3, angry ? 4 : 5, DK[1]);
      L.set(x + 4, ey + 2, Y[0]);
    }
  });
  // brows: flat when beaten, steeper and thicker when angry
  const slope = angry ? 0.7 : 0.38;
  const thick = angry ? 3 : 2;
  for (let i = 0; i < 10; i++) {
    const yy = (dead ? 18 + bob + dy : 16 + bob + dy + Math.floor(i * slope)) - (angry ? 1 : 0);
    L.rect(21 + i, yy, 1, thick, DK[2]);
    L.rect(50 - i, yy, 1, thick, DK[2]);
  }
  L.rect(35, 29 + bob + dy, 3, 3, Rg[4]);
  // mouth
  const mh = angry ? 8 : 6;
  const my = 33 + bob + dy;
  if (dead) {
    L.rect(28, my + 1, 16, 2, DK[1]);
    shade(L, 36, my + 3, 6, 6, 2, Rg.slice(1)); // tongue
    L.rect(38, my + 4, 1, 3, Rg[4]);
  } else {
    shade(L, 24, my, 24, mh, 2, DK.concat([DK[2]]), { amp: 0.2 });
    [26, 32, 38, 44].forEach((x) => L.rect(x, my, 3, angry ? 4 : 3, C("#fff1d0")));
    [29, 41].forEach((x) => L.rect(x, my + mh - 2, 2, angry ? 3 : 2, C("#fff1d0")));
  }
  outline(L, GOB);
  if (dead) {
    for (let i = 0; i < L.d.length; i++) if (L.d[i] && L.d[i] !== GOB) L.d[i] = mix(L.d[i], C("#6f8f90"), 0.34);
  }
  if (hit) {
    for (let i = 0; i < L.d.length; i++) if (L.d[i] && L.d[i] !== GOB) L.d[i] = mix(L.d[i], C("#ffffff"), 0.62);
  }
  return L;
}

export function goblinFrames() {
  return [
    goblin({ bob: 0 }),
    goblin({ bob: 1 }),
    goblin({ hit: true }),
    goblin({ bob: 0, mood: "angry" }),
    goblin({ bob: 1, mood: "angry" }),
    goblin({ mood: "defeated" }),
  ];
}
export { Layer };
