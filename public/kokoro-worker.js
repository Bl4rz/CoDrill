// Runs the Kokoro-82M speech model off the main thread. A plain module worker with no build
// step: it loads kokoro-js from the jsDelivr CDN (the same CDN Monaco already uses), so
// nothing about it is bundled into the site and the app has no native/ONNX dependency to
// install. The page starts it only after a player opts in to the better voice.
// Messages are defined in src/lib/kokoro/protocol.ts.
import { KokoroTTS } from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

let tts = null;
let loading = null;
let epoch = 0;
const queue = [];
let running = false;

function load() {
  if (loading) return loading;
  const files = new Map();
  loading = KokoroTTS.from_pretrained(MODEL_ID, {
    // fp16 on WebGPU is about 163 MB and several times faster than real time. The WASM
    // builds were measured at about 1.75x slower than real time on an Apple M4, so there
    // is deliberately no CPU fallback.
    dtype: "fp16",
    device: "webgpu",
    progress_callback: (p) => {
      if (p.status !== "progress" || !("file" in p)) return;
      files.set(p.file, { loaded: p.loaded, total: p.total });
      let loaded = 0;
      let total = 0;
      files.forEach((f) => {
        loaded += f.loaded;
        total += f.total;
      });
      if (total > 0) postMessage({ type: "progress", pct: Math.min(99, Math.round((loaded / total) * 100)) });
    },
  })
    .then(async (model) => {
      // The first generation compiles the GPU kernels (about 3 s). Pay that during the
      // download bar, not on the interviewer's first line.
      await model.generate("Ready.", { voice: "af_heart" });
      tts = model;
      postMessage({ type: "ready" });
    })
    .catch((err) => {
      loading = null;
      postMessage({ type: "error", message: err instanceof Error ? err.message : "Couldn't load the voice model." });
    });
  return loading;
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

async function run() {
  if (running) return;
  running = true;
  while (queue.length > 0) {
    const job = queue.shift();
    if (job.epoch !== epoch) continue;
    await load();
    if (!tts) break;
    for (const sentence of job.sentences) {
      await tick(); // let a cancel message through between sentences
      if (job.epoch !== epoch) break;
      const started = performance.now();
      try {
        const out = await tts.generate(sentence, { voice: job.voice });
        if (job.epoch !== epoch) break;
        const audio = out.audio;
        postMessage(
          { type: "chunk", id: job.id, epoch: job.epoch, audio, sampleRate: out.sampling_rate, genMs: performance.now() - started },
          [audio.buffer],
        );
      } catch (err) {
        postMessage({ type: "error", message: err instanceof Error ? err.message : "Speech failed." });
        queue.length = 0;
        break;
      }
    }
    postMessage({ type: "done", id: job.id, epoch: job.epoch });
  }
  running = false;
}

self.onmessage = (event) => {
  const msg = event.data;
  if (msg.type === "load") void load();
  else if (msg.type === "cancel") {
    epoch = msg.epoch;
    queue.length = 0;
  } else if (msg.type === "speak") {
    epoch = msg.epoch;
    queue.push({ id: msg.id, epoch: msg.epoch, sentences: msg.sentences, voice: msg.voice });
    void run();
  }
};
