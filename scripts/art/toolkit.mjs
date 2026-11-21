// Pixel toolkit used by the art build (scripts/build-art.mjs). Ported from the
// redesign reference: one pixel grid per image, 5-6 step ramps with hue-shifted
// shadows, light from the top right, ordered (Bayer) dithering only. Nothing in
// here ships to the browser: it runs at build time and the output is images.

const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bay = (x, y) => BAY[((y & 3) << 2) | (x & 3)];
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** "#rrggbb" -> little-endian RGBA uint32 (bytes R,G,B,A in memory). */
export const C = (h) => {
  const n = parseInt(h.slice(1), 16);
  return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0;
};
export const R = (a) => a.map(C);
const unpack = (c) => [c & 255, (c >> 8) & 255, (c >> 16) & 255];
export const mix = (a, b, t) => {
  const p = unpack(a);
  const q = unpack(b);
  return (
    ((255 << 24) |
      (Math.round(p[2] + (q[2] - p[2]) * t) << 16) |
      (Math.round(p[1] + (q[1] - p[1]) * t) << 8) |
      Math.round(p[0] + (q[0] - p[0]) * t)) >>>
    0
  );
};

/** Small seeded PRNG so every build produces the same art. */
export function rng(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Layer {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = new Uint32Array(w * h);
  }
  set(x, y, c) {
    x |= 0;
    y |= 0;
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
  }
  get(x, y) {
    x |= 0;
    y |= 0;
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : 0;
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
}

/** Rounded rect with ordered-dither shading, light from the top right. */
export function shade(L, x, y, w, h, r, ramp, o = {}) {
  const amp = o.amp ?? 0.5;
  const n = ramp.length - 1;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const dx = Math.min(i, w - 1 - i);
      const dy = Math.min(j, h - 1 - j);
      if (dx < r && dy < r) {
        const a = r - dx - 0.5;
        const b = r - dy - 0.5;
        if (a * a + b * b > r * r) continue;
      }
      const nx = (i + 0.5) / w;
      const ny = (j + 0.5) / h;
      const l = nx * 0.5 + (1 - ny) * 0.7;
      let k = Math.round((1 - l / 1.2) * n + (bay(i, j) - 0.5) * amp);
      k = clamp(k, 0, n);
      if (j === 0) k = Math.min(k, 1);
      if (i === w - 1) k = Math.min(k, 1);
      if (j === h - 1) k = Math.max(k, n - 1);
      if (i === 0) k = Math.max(k, n - 1);
      L.set(x + i, y + j, ramp[k]);
    }
  }
}

export function poly(L, pts, ramp, amp = 0.4) {
  let x0 = 1e9;
  let y0 = 1e9;
  let x1 = -1e9;
  let y1 = -1e9;
  pts.forEach((p) => {
    x0 = Math.min(x0, p[0]);
    y0 = Math.min(y0, p[1]);
    x1 = Math.max(x1, p[0]);
    y1 = Math.max(y1, p[1]);
  });
  const n = ramp.length - 1;
  for (let y = Math.floor(y0); y <= y1; y++) {
    for (let x = Math.floor(x0); x <= x1; x++) {
      let c = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const a = pts[i];
        const b = pts[j];
        if (a[1] > y + 0.5 !== b[1] > y + 0.5 && x + 0.5 < ((b[0] - a[0]) * (y + 0.5 - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
      }
      if (!c) continue;
      const nx = (x - x0) / (x1 - x0 + 1);
      const ny = (y - y0) / (y1 - y0 + 1);
      const k = Math.round((1 - (nx * 0.5 + (1 - ny) * 0.7) / 1.2) * n + (bay(x, y) - 0.5) * amp);
      L.set(x, y, ramp[clamp(k, 0, n)]);
    }
  }
}

/** One-pixel selective outline around everything already drawn. */
export function outline(L, col) {
  const { w, h, d } = L;
  const out = new Uint32Array(d);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (d[i]) continue;
      if ((x > 0 && d[i - 1]) || (x < w - 1 && d[i + 1]) || (y > 0 && d[i - w]) || (y < h - 1 && d[i + w])) out[i] = col;
    }
  }
  L.d = out.map((v, i) => v || d[i]);
}

export function blit(dst, src, ox, oy) {
  for (let y = 0; y < src.h; y++) {
    const yy = y + oy;
    if (yy < 0 || yy >= dst.h) continue;
    for (let x = 0; x < src.w; x++) {
      const v = src.d[y * src.w + x];
      if (!v) continue;
      const xx = x + ox;
      if (xx < 0 || xx >= dst.w) continue;
      dst.d[yy * dst.w + xx] = v;
    }
  }
}

/** Copy a sub-rectangle of a layer into a new one. */
export function crop(L, x, y, w, h) {
  const out = new Layer(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.d[j * w + i] = L.get(x + i, y + j);
  return out;
}

/** Lay equal-size frames out in a grid: `cols` frames per row. */
export function sheet(frames, cols = frames.length) {
  const fw = frames[0].w;
  const fh = frames[0].h;
  const rows = Math.ceil(frames.length / cols);
  const out = new Layer(fw * cols, fh * rows);
  frames.forEach((f, i) => blit(out, f, (i % cols) * fw, Math.floor(i / cols) * fh));
  return out;
}
