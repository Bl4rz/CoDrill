// The hero scene: night sky, moon, pine hills, a stone tower with a lit door, a
// sand path and framing pines. Built as separate layers so the page can animate
// the small ones (stars, clouds, fireflies) with CSS transforms and leave the big
// static ones (sky, land) alone.
import { Layer, bay, clamp, C, R, mix, rng, shade, blit } from "./toolkit.mjs";

const ridge = (H, f) => (x) => Math.round(f(x) * H);

export function buildScene(W, H, portrait) {
  const r = rng(21);
  const hz = Math.round(H * (portrait ? 0.7 : 0.62));

  /* ---- sky: ordered-dither bands, then the moon ---- */
  const sky = new Layer(W, H);
  const stops = [
    [0, "#06122a"], [0.22, "#0a2338"], [0.4, "#0e3a49"], [0.58, "#17625f"],
    [0.74, "#4f9c67"], [0.86, "#b5c066"], [0.95, "#f0b35a"], [1, "#ffd79a"],
  ].map((s) => [s[0], C(s[1])]);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const tt = clamp(y / (hz + H * 0.03), 0, 1);
      let i = 0;
      while (i < stops.length - 2 && tt > stops[i + 1][0]) i++;
      let f = (tt - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
      f = clamp((f - 0.5) * 2.8 + 0.5, 0, 1);
      sky.d[y * W + x] = f > bay(x, y) ? stops[i + 1][1] : stops[i][1];
    }
  }
  const mx = Math.round(W * (portrait ? 0.76 : 0.72));
  const my = Math.round(H * (portrait ? 0.14 : 0.17));
  const mr = Math.max(11, Math.round(H * 0.062));
  const cream = C("#fff1d0");
  const showMoon = !portrait;
  if (showMoon) {
    for (let y = my - mr * 3; y <= my + mr * 3; y++) {
      for (let x = mx - mr * 3; x <= mx + mr * 3; x++) {
        const d = Math.hypot(x - mx, y - my);
        if (d > mr && d < mr * 2.5) {
          const p = 1 - (d - mr) / (mr * 1.5);
          if (bay(x, y) < p * p * 0.5) sky.set(x, y, mix(sky.get(x, y), cream, 0.2));
        }
      }
    }
    const moonR = R(["#fffbea", "#fff1d0", "#ecd8aa", "#cdb88a"]);
    const craters = [[-0.38, -0.12, 0.2], [0.26, 0.3, 0.15], [-0.1, 0.5, 0.11], [0.42, -0.38, 0.1], [-0.2, -0.5, 0.08]];
    for (let y = -mr; y <= mr; y++) {
      for (let x = -mr; x <= mr; x++) {
        if (x * x + y * y > mr * mr) continue;
        const lx = x / mr;
        const ly = y / mr;
        const l = (lx * 0.6 - ly * 0.8) * 0.5 + 0.5;
        let k = l > 0.72 ? 0 : l > 0.48 ? 1 : l > 0.28 ? 2 : 3;
        craters.forEach((c) => {
          const dd = Math.hypot(lx - c[0], ly - c[1]);
          if (dd < c[2]) k = Math.min(3, Math.max(k, 2) + (dd < c[2] * 0.55 ? 1 : 0));
        });
        sky.set(mx + x, my + y, moonR[k]);
      }
    }
  }

  /* ---- stars: two groups that twinkle out of step ---- */
  const starsA = new Layer(W, H);
  const starsB = new Layer(W, H);
  const dim = C("#9fc3c4");
  const nStars = Math.floor((W * H) / 700);
  for (let i = 0; i < nStars; i++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * hz * 0.78);
    const ph = r() * 6;
    const big = r() < 0.12;
    if (showMoon && Math.hypot(x - mx, y - my) < mr * 2.6) continue;
    const L = ph < 3 ? starsA : starsB;
    L.set(x, y, cream);
    if (big) {
      L.set(x - 1, y, dim);
      L.set(x + 1, y, dim);
      L.set(x, y - 1, dim);
      L.set(x, y + 1, dim);
    }
  }

  /* ---- clouds: two tiling layers that drift at different speeds ---- */
  const cloudsA = new Layer(W, H);
  const cloudsB = new Layer(W, H);
  const cloudCool = R(["#3f7a8c", "#2e5f78", "#22496a"]);
  const cloudWarm = R(["#ffe0a8", "#f4a866", "#c4705c"]);
  const cr = rng(9);
  [0.14, 0.25, 0.34, 0.43, 0.51].forEach((fy, idx) => {
    const w = 44 + Math.floor(cr() * 40);
    const h = 13 + Math.floor(cr() * 8);
    const cy = Math.round(H * fy);
    const at = clamp(cy / hz, 0, 1);
    const ramp = cloudCool.map((c, i) => mix(c, cloudWarm[i], clamp((at - 0.45) * 2.2, 0, 1)));
    const L = new Layer(w, h);
    const base = h - 3;
    const n = 5 + Math.floor(cr() * 3);
    const tops = new Array(w).fill(h);
    for (let k = 0; k < n; k++) {
      const cx = w * (0.16 + (0.68 * k) / (n - 1)) + (cr() - 0.5) * 4;
      const rad = h * (0.24 + 0.4 * Math.pow(Math.sin((Math.PI * k) / (n - 1)), 1.1) + cr() * 0.1);
      for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
        for (let y = Math.floor(base - rad * 1.7); y <= base; y++) {
          if (x < 0 || x >= w || y < 0) continue;
          const dx = (x - cx) / rad;
          const dy = (y - (base - rad * 0.75)) / (rad * 1.05);
          if (dx * dx + dy * dy <= 1) tops[x] = Math.min(tops[x], y);
        }
      }
    }
    for (let x = 0; x < w; x++) {
      for (let y = tops[x]; y <= base; y++) {
        const dd = y - tops[x];
        const span = base - tops[x] + 1;
        let k = dd < 1 ? 0 : dd + (bay(x, y) - 0.5) * 2 < span * 0.5 ? 1 : 2;
        if (y >= base - 1) k = 2;
        L.set(x, y, ramp[k]);
      }
    }
    const x0 = Math.floor(cr() * W);
    cr(); // keep the sequence the reference used (speed)
    const dst = idx % 2 === 0 ? cloudsA : cloudsB;
    blit(dst, L, x0, cy); // wrap so the layer tiles seamlessly
    blit(dst, L, x0 - W, cy);
    blit(dst, L, x0 + W, cy);
  });

  /* ---- land: far mountains, mid hill, tower, near hill, path, pines, grass ---- */
  const land = new Layer(W, H);
  const tx = Math.round(W * (portrait ? 0.8 : 0.86));
  const farY = ridge(H, (x) => hz / H - 0.03 - 0.11 * (1 - Math.abs(Math.sin(x * 0.0105 + 0.9))) - 0.04 * (1 - Math.abs(Math.sin(x * 0.027 + 2.1))) - 0.012 * Math.sin(x * 0.09));
  const midY = ridge(H, (x) => hz / H + 0.075 + 0.022 * Math.sin(x * 0.02 + 0.5) + 0.007 * Math.sin(x * 0.05 + 1) - 0.045 * Math.exp(-Math.pow((x - tx) / (W * 0.11), 2)));
  const nearY = ridge(H, (x) => hz / H + 0.165 + 0.018 * Math.sin(x * 0.016 + 2) + 0.006 * Math.sin(x * 0.045));

  function hill(rd, ramp, th) {
    for (let x = 0; x < W; x++) {
      const top = rd(x);
      for (let y = top; y < H; y++) {
        const d = y - top + (bay(x, y) - 0.5) * 3.2;
        let k = 0;
        for (let i = 0; i < th.length; i++) if (d > th[i]) k = i + 1;
        land.set(x, y, ramp[k]);
      }
    }
  }
  function pine(cx, by, h, P) {
    const tiers = h > 30 ? 4 : h > 18 ? 3 : 2;
    const trunk = Math.max(2, Math.round(h * 0.13));
    const body = h - trunk;
    const th = Math.ceil(body / (tiers * 0.62 + 0.38));
    const step = (body - th) / Math.max(1, tiers - 1);
    const maxW = Math.max(5, Math.round(h * 0.5)) | 1;
    for (let k = 0; k < tiers; k++) {
      const y0 = Math.round(by - trunk - body + k * step);
      const wk = Math.round(maxW * (0.45 + (0.55 * (k + 1)) / tiers));
      for (let rr = 0; rr < th; rr++) {
        const half = Math.max(0.5, ((wk / 2) * (rr + 1)) / th);
        for (let x = Math.round(cx - half); x <= Math.round(cx + half - 0.5); x++) {
          const u = (x - cx) / half;
          let c = u > 0.45 ? P[0] : u > -0.2 ? P[1] : P[2];
          if (rr === th - 1) c = P[2];
          if (u > 0.85 && rr < th - 1) c = P[0];
          land.set(x, y0 + rr, c);
        }
      }
    }
    for (let y = 0; y < trunk; y++) {
      land.set(cx - 1, by - trunk + y, P[3]);
      land.set(cx, by - trunk + y, P[3]);
    }
  }

  hill(farY, R(["#2f8078", "#1c5864", "#14444f", "#0f3541"]), [1, 8, 26]);
  const farP = R(["#1f6a68", "#16505b", "#103f4b", "#0b2f39"]);
  for (let x = 4; x < W - 4; x += 5 + Math.floor(r() * 6)) if (r() < 0.8) pine(x, farY(x) + 6, 8 + Math.floor(r() * 7), farP);
  hill(midY, R(["#3a9a66", "#1f7058", "#165050", "#103a45"]), [1, 9, 28]);

  const baseY = midY(tx) + 6;
  (function tower() {
    const S5 = R(["#9db2d4", "#6c86ae", "#47608a", "#304470", "#202f55"]);
    const bw = 20;
    const bh = Math.round(H * 0.215);
    const x0 = tx - 10;
    const top = baseY - bh;
    function col(x, y, xa, wa) {
      const t = (x - xa) / (wa - 1);
      let k = t > 0.82 ? 0 : t > 0.56 ? 1 : t > 0.3 ? 2 : 3;
      if (Math.abs(t - 0.82) < 0.05 && bay(x, y) > 0.5) k = 1;
      const row = Math.floor((y - top) / 5);
      if ((y - top) % 5 === 0) k = Math.min(4, k + 1);
      else if ((x - xa + (row & 1 ? 3 : 0)) % 7 === 0) k = Math.min(4, k + 1);
      return S5[Math.min(4, k)];
    }
    for (let y = top; y <= baseY; y++) for (let x = x0; x < x0 + bw; x++) land.set(x, y, col(x, y, x0, bw));
    const cw = 26;
    const cx0 = tx - 13;
    for (let y = top - 8; y < top; y++) {
      for (let x = cx0; x < cx0 + cw; x++) {
        if (y < top - 5 && (x - cx0) % 6 >= 4) continue;
        land.set(x, y, col(x, y, cx0, cw));
      }
    }
    for (let x = cx0; x < cx0 + cw; x++) land.set(x, top, S5[4]);
    const lit = R(["#fff3c4", "#ffd25e", "#ffb347"]);
    [top + 6, top + 19, top + 32].forEach((wy) => {
      if (wy + 7 >= baseY - 12) return;
      land.rect(tx - 2, wy - 1, 5, 8, S5[4]);
      land.rect(tx - 1, wy, 3, 6, lit[2]);
      land.set(tx, wy - 1, S5[4]);
      land.rect(tx, wy, 1, 6, lit[1]);
      land.set(tx - 1, wy + 1, lit[0]);
    });
    [[x0 + 3, top + 12], [x0 + bw - 4, top + 12], [x0 + 3, top + 26], [x0 + bw - 4, top + 26]].forEach((p) => {
      if (p[1] + 3 < baseY - 12) land.rect(p[0], p[1], 1, 3, lit[2]);
    });
    land.rect(tx - 4, baseY - 11, 8, 11, S5[4]);
    land.rect(tx - 3, baseY - 10, 6, 10, lit[2]);
    land.rect(tx, baseY - 10, 3, 10, lit[1]);
    land.set(tx - 3, baseY - 10, S5[4]);
    land.set(tx + 2, baseY - 10, S5[4]);
    for (let y = top - 19; y < top - 8; y++) land.set(tx, y, C("#2a2036"));
    for (let rr = 0; rr < 5; rr++) for (let i = 0; i < 9 - rr; i++) land.set(tx + 1 + i, top - 19 + rr, rr < 2 ? lit[1] : rr < 4 ? lit[2] : C("#e07b2a"));
  })();

  const trees = R(["#49b36f", "#25805f", "#175a56", "#2a1d33"]);
  for (let x = 2; x < W - 2; x += 6 + Math.floor(r() * 8)) {
    if (Math.abs(x - tx) < 17) continue;
    pine(x, midY(x) + 3 + Math.floor(r() * 7), 14 + Math.floor(r() * 12), trees);
  }
  hill(nearY, R(["#63cc78", "#37a468", "#257c5c", "#195b52", "#10404a"]), [1, 6, 18, 42]);

  /* path from the tower door down to the foreground */
  const yt = baseY;
  const mxEnd = W * (portrait ? 0.5 : 0.58);
  const pc = (y) => {
    const s = clamp((y - yt) / (H - yt), 0, 1);
    const e = s * s * (3 - 2 * s);
    return tx + (mxEnd - tx) * e + Math.sin(s * Math.PI * 1.6) * W * 0.05 * (1 - s * 0.35);
  };
  const pw = (y) => 3 + Math.pow(clamp((y - yt) / (H - yt), 0, 1), 1.15) * (portrait ? 28 : 36);
  const sand = R(["#f1d79a", "#d9b26f", "#b88a52", "#8a6440"]);
  for (let y = yt; y < H; y++) {
    const c = pc(y);
    const w = pw(y);
    for (let x = Math.floor(c - w / 2 - 1); x <= Math.ceil(c + w / 2 + 1); x++) {
      const dd = Math.abs(x - c) - w / 2;
      if (dd > 1) continue;
      let k = dd > 0.2 ? 3 : dd > -1.2 ? 2 : bay(x, y) > 0.68 ? 1 : 0;
      if (dd > 0 && dd <= 1 && bay(x, y) < 0.4) continue;
      if (dd < -2 && r() < 0.03) k = 1;
      land.set(x, y, sand[k]);
    }
  }

  const big = R(["#58c179", "#2d9367", "#1b6659", "#22182c"]);
  const bigs = portrait ? [[W * 0.04, 44], [W * 0.96, 40]] : [[W * 0.035, 52], [W * 0.105, 38], [W * 0.975, 46]];
  bigs.forEach((p) => pine(Math.round(p[0]), nearY(Math.round(p[0])) + Math.round(H * 0.075), p[1], big));

  const tuftA = C("#8ef0a0");
  const tuftB = C("#3fae6e");
  for (let i = 0; i < (W * H) / 210; i++) {
    const x = Math.floor(r() * W);
    const y = nearY(x) + 4 + Math.floor(r() * (H - nearY(x) - 5));
    if (y >= H - 1) continue;
    if (Math.abs(x - pc(y)) < pw(y) / 2 + 3) continue;
    const q = r();
    if (q < 0.72) {
      land.set(x, y, tuftB);
      land.set(x, y - 1, tuftA);
      if (r() < 0.5) {
        land.set(x + 1, y, tuftB);
        land.set(x + 1, y - 2, tuftA);
        land.set(x + 1, y - 1, tuftB);
      }
    } else if (q < 0.975) {
      const fc = [C("#ffb347"), C("#fff1d0"), C("#ff8fa0")][Math.floor(r() * 3)];
      land.set(x, y, tuftB);
      land.set(x, y - 1, tuftB);
      land.set(x, y - 2, fc);
    } else {
      const rk = R(["#b9c9cf", "#8aa0ad", "#5f7684", "#43586a"]);
      shade(land, x, y - 2, 6, 4, 1, rk, { amp: 0.3 });
    }
  }

  /* ---- fireflies: two groups that blink out of step ---- */
  const fliesA = new Layer(W, H);
  const fliesB = new Layer(W, H);
  const glow = C("#ffd36a");
  for (let i = 0; i < 14; i++) {
    const x = Math.round(r() * W);
    const y = Math.round(H * (0.5 + r() * 0.4));
    r();
    r(); // phase and speed, unused: motion is a CSS step animation
    (i % 2 ? fliesA : fliesB).set(x, y, glow);
  }

  /* ---- the mascot stands on the path; its shadow is baked into the land ---- */
  const fy = Math.round(H * (portrait ? 0.93 : 0.86));
  const fx = Math.round(pc(fy));
  for (let y = fy - 3; y <= fy + 3; y++) {
    for (let x = fx - 26; x <= fx + 17; x++) {
      const dx = (x - (fx - 4)) / 22;
      const dy = (y - fy) / 3.4;
      if (dx * dx + dy * dy < 1 && bay(x, y) < 0.92 && land.get(x, y)) land.set(x, y, mix(land.get(x, y), C("#04121a"), 0.5));
    }
  }

  return { sky, starsA, starsB, cloudsA, cloudsB, land, fliesA, fliesB, mascot: { x: fx - 24, y: fy - 55 } };
}
