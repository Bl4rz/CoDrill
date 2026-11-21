// The Adventure map backdrop: the same world as the hero scene (night meadow,
// pines, a sand path, the stone tower) as one tall strip. Nodes are drawn by
// the page on top; this image only places the path under them.
import { Layer, bay, clamp, C, R, rng, shade } from "./toolkit.mjs";

export const MAP_W = 112;
export const MAP_H = 262;
// Node centers in art pixels, top to bottom. The last one is the boss.
export const MAP_NODES = [
  { x: 27, y: 14 },
  { x: 81, y: 56 },
  { x: 31, y: 98 },
  { x: 81, y: 140 },
  { x: 29, y: 182 },
  { x: 56, y: 227 },
];
const TOWER = { x: 94, base: 250 };

function pine(L, cx, by, h, P) {
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
        L.set(x, y0 + rr, c);
      }
    }
  }
  for (let y = 0; y < trunk; y++) {
    L.set(cx - 1, by - trunk + y, P[3]);
    L.set(cx, by - trunk + y, P[3]);
  }
}

function tower(L, tx, baseY, bh) {
  const S5 = R(["#9db2d4", "#6c86ae", "#47608a", "#304470", "#202f55"]);
  const bw = 20;
  const x0 = tx - 10;
  const top = baseY - bh;
  const col = (x, y, xa, wa) => {
    const t = (x - xa) / (wa - 1);
    let k = t > 0.82 ? 0 : t > 0.56 ? 1 : t > 0.3 ? 2 : 3;
    if (Math.abs(t - 0.82) < 0.05 && bay(x, y) > 0.5) k = 1;
    const row = Math.floor((y - top) / 5);
    if ((y - top) % 5 === 0) k = Math.min(4, k + 1);
    else if ((x - xa + (row & 1 ? 3 : 0)) % 7 === 0) k = Math.min(4, k + 1);
    return S5[Math.min(4, k)];
  };
  for (let y = top; y <= baseY; y++) for (let x = x0; x < x0 + bw; x++) L.set(x, y, col(x, y, x0, bw));
  const cw = 26;
  const cx0 = tx - 13;
  for (let y = top - 8; y < top; y++) {
    for (let x = cx0; x < cx0 + cw; x++) {
      if (y < top - 5 && (x - cx0) % 6 >= 4) continue;
      L.set(x, y, col(x, y, cx0, cw));
    }
  }
  for (let x = cx0; x < cx0 + cw; x++) L.set(x, top, S5[4]);
  const lit = R(["#fff3c4", "#ffd25e", "#ffb347"]);
  [top + 8, top + 22, top + 36].forEach((wy) => {
    if (wy + 7 >= baseY - 12) return;
    L.rect(tx - 2, wy - 1, 5, 8, S5[4]);
    L.rect(tx - 1, wy, 3, 6, lit[2]);
    L.rect(tx, wy, 1, 6, lit[1]);
    L.set(tx - 1, wy + 1, lit[0]);
  });
  L.rect(tx - 4, baseY - 11, 8, 11, S5[4]);
  L.rect(tx - 3, baseY - 10, 6, 10, lit[2]);
  L.rect(tx, baseY - 10, 3, 10, lit[1]);
  for (let y = top - 19; y < top - 8; y++) L.set(tx, y, C("#2a2036"));
  for (let rr = 0; rr < 5; rr++) for (let i = 0; i < 9 - rr; i++) L.set(tx + 1 + i, top - 19 + rr, rr < 2 ? lit[1] : rr < 4 ? lit[2] : C("#e07b2a"));
}

/** Catmull-Rom through the points, sampled densely. */
function curve(pts, per = 40) {
  const out = [];
  const p = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < p.length - 2; i++) {
    for (let s = 0; s < per; s++) {
      const t = s / per;
      const f = (a, b, c, d) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
      out.push([f(p[i - 1].x, p[i].x, p[i + 1].x, p[i + 2].x), f(p[i - 1].y, p[i].y, p[i + 1].y, p[i + 2].y)]);
    }
  }
  out.push([pts[pts.length - 1].x, pts[pts.length - 1].y]);
  return out;
}

export function buildMap() {
  const W = MAP_W;
  const H = MAP_H;
  const r = rng(33);
  const L = new Layer(W, H);

  // ground: three greens, patches placed by low-frequency waves, edges dithered
  const tones = R(["#195b52", "#144a4d", "#103d45", "#0d323d"]);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = (Math.sin(x * 0.11 + y * 0.045) + Math.sin(x * 0.05 - y * 0.08 + 2) + Math.sin(y * 0.021 + x * 0.02 + 4)) / 3;
      const t = (v + 1) / 2; // 0..1
      const f = clamp(t * 3 - 0.0, 0, 2.999);
      const i = Math.floor(f);
      const frac = f - i;
      const hi = frac > bay(x, y) ? i + 1 : i;
      L.set(x, y, tones[clamp(3 - hi, 0, 3)]);
    }
  }

  // the path
  const trail = curve([{ x: MAP_NODES[0].x, y: MAP_NODES[0].y - 12 }, ...MAP_NODES]);
  const spur = [];
  const last = MAP_NODES[MAP_NODES.length - 1];
  for (let s = 0; s <= 40; s++) {
    const t = s / 40;
    spur.push([last.x + (TOWER.x - last.x) * t, last.y + (TOWER.base - 4 - last.y) * t + Math.sin(t * Math.PI) * -6]);
  }
  const sand = R(["#f1d79a", "#d9b26f", "#b88a52", "#8a6440"]);
  const mask = new Map();
  const stamp = (pts, rad) => {
    for (const [px, py] of pts) {
      for (let y = Math.floor(py - rad - 1); y <= Math.ceil(py + rad + 1); y++) {
        for (let x = Math.floor(px - rad - 1); x <= Math.ceil(px + rad + 1); x++) {
          const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
          const key = y * W + x;
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const prev = mask.get(key);
          if (prev === undefined || d < prev) mask.set(key, d);
        }
      }
    }
  };
  stamp(trail, 3.4);
  stamp(spur, 2.2);
  const reach = (rad) => (x, y) => {
    const d = mask.get(y * W + x);
    return d !== undefined && d <= rad;
  };
  for (const [key, d] of mask) {
    const x = key % W;
    const y = Math.floor(key / W);
    const edge = d > 3.0 ? 3 : d > 2.2 ? 2 : bay(x, y) > 0.7 ? 1 : 0;
    if (d > 3.4) continue;
    if (d > 3.0 && bay(x, y) < 0.45) continue;
    L.set(x, y, sand[d > 2.2 ? Math.max(edge, 2) : edge]);
  }

  // keep-out areas: path, nodes and their labels, the tower
  const nodeRects = MAP_NODES.map((n, i) => ({ x0: n.x - 17, x1: n.x + 17, y0: n.y - 15, y1: n.y + (i === MAP_NODES.length - 1 ? 42 : 36) }));
  const near = (x, y, pad) =>
    nodeRects.some((q) => x > q.x0 - pad && x < q.x1 + pad && y > q.y0 - pad && y < q.y1 + pad) ||
    (x > TOWER.x - 18 - pad && x < TOWER.x + 18 + pad && y > TOWER.base - 78 - pad && y < TOWER.base + pad);
  const nearPath = (x, y, rad) => {
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (reach(3.4)(x + dx, y + dy)) return true;
    return false;
  };

  // pines, back to front
  const trees = R(["#49b36f", "#25805f", "#175a56", "#2a1d33"]);
  const placed = [];
  for (let tries = 0; tries < 600 && placed.length < 26; tries++) {
    const x = 4 + Math.floor(r() * (W - 8));
    const by = 22 + Math.floor(r() * (H - 26));
    const h = 14 + Math.floor(r() * 12);
    if (near(x, by - h / 2, 2) || near(x, by, 2) || nearPath(x, by, 7) || nearPath(x, by - Math.round(h / 2), 7)) continue;
    if (placed.some((p) => Math.abs(p.x - x) < 10 && Math.abs(p.by - by) < 12)) continue;
    placed.push({ x, by, h });
  }
  placed.sort((a, b) => a.by - b.by).forEach((p) => pine(L, p.x, p.by, p.h, trees));

  tower(L, TOWER.x, TOWER.base, 58);

  // grass, flowers and rocks
  const tuftA = C("#8ef0a0");
  const tuftB = C("#3fae6e");
  for (let i = 0; i < (W * H) / 90; i++) {
    const x = Math.floor(r() * W);
    const y = 3 + Math.floor(r() * (H - 4));
    if (near(x, y, 0) || nearPath(x, y, 3)) continue;
    const q = r();
    if (q < 0.72) {
      L.set(x, y, tuftB);
      L.set(x, y - 1, tuftA);
    } else if (q < 0.97) {
      const fc = [C("#ffb347"), C("#fff1d0"), C("#ff8fa0")][Math.floor(r() * 3)];
      L.set(x, y, tuftB);
      L.set(x, y - 1, tuftB);
      L.set(x, y - 2, fc);
    } else {
      shade(L, x, y - 2, 5, 3, 1, R(["#b9c9cf", "#8aa0ad", "#5f7684", "#43586a"]), { amp: 0.3 });
    }
  }
  return L;
}
