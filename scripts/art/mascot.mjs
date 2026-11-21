// The Codrill robot: green body, navy visor with amber eyes, and a drill-bit
// antenna (a nod to the name). Four expressions are small variations of one
// sprite: neutral, thinking, impressed, concerned.
import { Layer, shade, outline, clamp, C } from "./toolkit.mjs";
import { G, Gd, A, N, OUT } from "./palettes.mjs";

export const MASCOT_W = 48;
export const MASCOT_H = 58;
export const HEAD_H = 36; // portrait crop: antenna, head and the top of the body
export const EXPRESSIONS = ["neutral", "thinking", "impressed", "concerned"];

function eye(L, x, y, w, h) {
  shade(L, x, y, w, h, 1, A, { amp: 0.3 });
  L.set(x + w - 2, y + 1, A[0]);
}

/**
 * One frame. fr: drill phase (any integer, period 4). bob: 0 or 1 (head and
 * arms lift one pixel). blink: eyes shut. look: eyes shift left/right.
 */
export function mascot({ fr = 0, bob = 0, blink = false, look = 0, expr = "neutral" } = {}) {
  const L = new Layer(MASCOT_W, MASCOT_H);
  shade(L, 15, 48, 7, 6, 2, Gd);
  shade(L, 26, 48, 7, 6, 2, Gd);
  shade(L, 6, 35, 6, 11, 3, G);
  shade(L, 36, 35, 6, 11, 3, G);
  shade(L, 12, 34, 24, 15, 4, G);
  shade(L, 20, 38, 8, 7, 1, N, { amp: 0.2 });
  L.rect(21, 40, 2, 2, A[1]);
  L.rect(24, 40, 2, 2, G[1]);
  L.rect(21, 43, 5, 1, A[3]);

  /* drill bit antenna: rotating stripes */
  for (let r = 0; r < 11; r++) {
    const w = Math.min(8, 1 + Math.floor(r * 0.72));
    const x0 = 24 - Math.floor(w / 2);
    for (let i = 0; i < w; i++) {
      const stripe = ((r + i + fr) >> 1) & 1;
      let k = stripe ? 2 : 3;
      if (i >= w - 2) k -= 1;
      if (i === 0 && w > 2) k += 1;
      L.set(x0 + i, 1 + bob + r, A[clamp(k, 0, 4)]);
    }
  }
  L.set(24, 1 + bob, A[0]);

  shade(L, 2, 18 + bob, 5, 9, 2, Gd);
  shade(L, 41, 18 + bob, 5, 9, 2, Gd);
  L.set(4, 22 + bob, A[2]);
  L.set(43, 22 + bob, A[2]);
  shade(L, 6, 11 + bob, 36, 23, 7, G);
  shade(L, 10, 16 + bob, 28, 13, 4, N, { amp: 0.25 });
  for (let i = 0; i < 4; i++) L.set(14 + i, 18 + bob + i, N[0]);
  for (let i = 0; i < 2; i++) L.set(20 + i, 18 + bob + i, N[0]);

  const b = bob;
  const lx = 15 + look;
  const rx = 27 + look;
  if (blink && expr !== "impressed") {
    L.rect(lx, 23 + b, 6, 1, A[2]);
    L.rect(rx, 23 + b, 6, 1, A[2]);
  } else if (expr === "neutral") {
    eye(L, lx, 19 + b, 6, 8);
    eye(L, rx, 19 + b, 6, 8);
  } else if (expr === "thinking") {
    // eyes drift up and to the side, one squinted, three dots below
    eye(L, lx + 2, 18 + b, 6, 6);
    eye(L, rx + 2, 20 + b, 6, 4);
    [20, 24, 28].forEach((x) => L.set(x, 27 + b, A[2]));
  } else if (expr === "impressed") {
    // tall bright eyes, a small smile, two sparkles on the head
    eye(L, lx, 18 + b, 6, 7);
    eye(L, rx, 18 + b, 6, 7);
    L.rect(lx + 1, 19 + b, 1, 1, A[0]);
    L.rect(rx + 1, 19 + b, 1, 1, A[0]);
    L.rect(21, 26 + b, 6, 1, A[2]);
    L.set(20, 25 + b, A[2]);
    L.set(27, 25 + b, A[2]);
    [[3, 8], [44, 6]].forEach(([x, y]) => {
      L.set(x, y + b, A[0]);
      L.set(x - 1, y + b, A[1]);
      L.set(x + 1, y + b, A[1]);
      L.set(x, y - 1 + b, A[1]);
      L.set(x, y + 1 + b, A[1]);
    });
  } else if (expr === "concerned") {
    // worried brows: the outer top corner of each eye is cut away
    eye(L, lx, 19 + b, 6, 7);
    eye(L, rx, 19 + b, 6, 7);
    [[lx, 19], [lx + 1, 19], [lx, 20], [rx + 5, 19], [rx + 4, 19], [rx + 5, 20]].forEach(([x, y]) => L.set(x, y + b, N[3]));
    // wobbly mouth, and a sweat drop on the head
    [[21, 27], [22, 26], [23, 27], [24, 26], [25, 27], [26, 26]].forEach(([x, y]) => L.set(x, y + b, A[2]));
    L.set(39, 13 + b, N[0]);
    L.rect(38, 14 + b, 3, 2, N[0]);
    L.set(39, 16 + b, N[1]);
  }
  outline(L, OUT);
  return L;
}

/** The hero idle loop: 24 frames at 8 fps (3 s). Drill spins, head bobs, eyes blink and look around. */
export function idleFrames(expr, n, headOnly = false) {
  const frames = [];
  const per = n / 4; // look changes four times per loop
  for (let f = 0; f < n; f++) {
    const look = [0, 1, 0, -1][Math.floor(f / per) % 4];
    const m = mascot({
      fr: f,
      bob: Math.floor(f / (n / 4)) & 1,
      blink: f === n - 2 || f === n - 1,
      look: expr === "neutral" ? look : 0,
      expr,
    });
    frames.push(headOnly ? cropHead(m) : m);
  }
  return frames;
}

function cropHead(m) {
  const out = new Layer(MASCOT_W, HEAD_H);
  out.d.set(m.d.subarray(0, MASCOT_W * HEAD_H));
  return out;
}
export { C };
