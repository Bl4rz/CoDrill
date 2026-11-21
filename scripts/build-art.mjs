#!/usr/bin/env node
// Bakes every pixel-art image the site uses. Run: npm run art
//
// The drawing code in scripts/art/ is procedural (palette ramps, Bayer
// dithering, outlines). None of it ships to the browser. This script renders
// it once and writes small images to public/art/ with content-hashed names,
// plus src/lib/art-manifest.json, which the components read.
//
// Each image is encoded twice (WebP lossless and palette PNG-8) and the
// smaller one is kept. Hero layers must stay under BUDGET bytes.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Layer, sheet } from "./art/toolkit.mjs";
import { buildScene } from "./art/scene.mjs";
import { mascot, idleFrames, EXPRESSIONS, MASCOT_W, MASCOT_H, HEAD_H } from "./art/mascot.mjs";
import { goblinFrames, GOBLIN_W, GOBLIN_H, GOBLIN_STATES } from "./art/goblin.mjs";
import { arena, ARENA_W, ARENA_H, GOBLIN_AT } from "./art/boss.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "art");
const BUDGET = 40 * 1024;

// Hero art grids. Each is shown at a whole-number multiple (k) set in CSS.
const SCENES = {
  S: { w: 160, h: 272, portrait: true }, // phones up to 480 css px, shown at 3x
  M: { w: 240, h: 236, portrait: true }, // 481-900, shown at 4x
  L: { w: 360, h: 210, portrait: false }, // 901+, shown at 4x and up
};

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const manifest = {};
const report = [];

async function encode(layer, name, { budget } = {}) {
  const raw = Buffer.from(layer.d.buffer, layer.d.byteOffset, layer.d.byteLength);
  const img = () => sharp(raw, { raw: { width: layer.w, height: layer.h, channels: 4 } });
  const png = await img().png({ palette: true, colors: 256, dither: 0, effort: 10, compressionLevel: 9 }).toBuffer();
  const webp = await img().webp({ lossless: true, effort: 6, exact: true }).toBuffer();
  const useWebp = webp.length <= png.length;
  const buf = useWebp ? webp : png;
  const ext = useWebp ? "webp" : "png";
  const hash = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 8);
  const file = `${name}.${hash}.${ext}`;
  fs.writeFileSync(path.join(outDir, file), buf);
  report.push({ name, w: layer.w, h: layer.h, png: png.length, webp: webp.length, kept: ext, bytes: buf.length });
  if (budget && buf.length > budget) throw new Error(`${name} is ${buf.length} bytes, over the ${budget} byte budget`);
  return { src: `/art/${file}`, w: layer.w, h: layer.h, bytes: buf.length };
}

/** Two layers side by side: the CSS animation slides between them in one step. */
const pair = (a, b) => sheet([a, b], 2);

// ---- hero scenes ----
manifest.scene = {};
for (const [key, spec] of Object.entries(SCENES)) {
  const s = buildScene(spec.w, spec.h, spec.portrait);
  manifest.scene[key] = {
    w: spec.w,
    h: spec.h,
    mascot: s.mascot,
    sky: await encode(s.sky, `scene-${key}-sky`, { budget: BUDGET }),
    land: await encode(s.land, `scene-${key}-land`, { budget: BUDGET }),
    stars: await encode(pair(s.starsA, s.starsB), `scene-${key}-stars`, { budget: BUDGET }),
    flies: await encode(pair(s.fliesA, s.fliesB), `scene-${key}-flies`, { budget: BUDGET }),
    cloudsA: await encode(s.cloudsA, `scene-${key}-clouds-a`, { budget: BUDGET }),
    cloudsB: await encode(s.cloudsB, `scene-${key}-clouds-b`, { budget: BUDGET }),
  };
}

// ---- mascot ----
// Hero idle loop: 24 frames in one strip, 8 fps.
const idle = idleFrames("neutral", 24);
manifest.mascot = {
  fw: MASCOT_W,
  fh: MASCOT_H,
  full: { frames: 24, ...(await encode(sheet(idle), "mascot-idle", { budget: BUDGET })) },
};
// Portraits: head crops, 12 frames per expression, one expression per row.
const rows = [];
for (const e of EXPRESSIONS) rows.push(...idleFrames(e, 12, true));
manifest.mascot.head = {
  frames: 12,
  fh: HEAD_H,
  rows: Object.fromEntries(EXPRESSIONS.map((e, i) => [e, i])),
  ...(await encode(sheet(rows, 12), "mascot-head", { budget: BUDGET })),
};

// ---- goblin ----
manifest.goblin = {
  fw: GOBLIN_W,
  fh: GOBLIN_H,
  states: GOBLIN_STATES,
  at: GOBLIN_AT,
  ...(await encode(sheet(goblinFrames()), "goblin", { budget: BUDGET })),
  arena: await encode(arena(), "arena", { budget: BUDGET }),
  arenaW: ARENA_W,
  arenaH: ARENA_H,
};

// ---- icons: favicon (mascot head) ----
const face = mascot({ expr: "neutral" });
const iconArt = new Layer(36, 36);
for (let y = 0; y < 36; y++) for (let x = 0; x < 36; x++) iconArt.d[y * 36 + x] = face.get(6 + x, 2 + y);
fs.writeFileSync(path.join(root, "src/lib/art-icon.json"), JSON.stringify({ w: 36, h: 36 }));
const iconPng = await sharp(Buffer.from(iconArt.d.buffer), { raw: { width: 36, height: 36, channels: 4 } })
  .resize(72, 72, { kernel: "nearest" })
  .png({ palette: true })
  .toBuffer();
fs.writeFileSync(path.join(root, "src/app/icon.png"), iconPng);
const ink = { r: 6, g: 20, b: 28, alpha: 1 };
const apple = await sharp(Buffer.from(iconArt.d.buffer), { raw: { width: 36, height: 36, channels: 4 } })
  .resize(180, 180, { kernel: "nearest", fit: "contain", background: ink })
  .flatten({ background: ink })
  .png({ palette: true })
  .toBuffer();
fs.writeFileSync(path.join(root, "src/app/apple-icon.png"), apple);

fs.rmSync(path.join(root, "src/lib/art-icon.json"), { force: true });
fs.writeFileSync(path.join(root, "src/lib/art-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

const pad = (s, n) => String(s).padEnd(n);
console.log(pad("image", 26), pad("size", 10), pad("png", 8), pad("webp", 8), "kept");
for (const r of report) console.log(pad(r.name, 26), pad(`${r.w}x${r.h}`, 10), pad(r.png, 8), pad(r.webp, 8), `${r.kept} ${r.bytes}`);
const total = report.reduce((n, r) => n + r.bytes, 0);
console.log(`\n${report.length} images, ${(total / 1024).toFixed(1)} KB total in public/art/`);
