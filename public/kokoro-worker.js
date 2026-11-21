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
    // fp32 on WebGPU (about 326 MB) is the only build that was measured to sound right: fp16
    // outputs NaN samples, q4f16 is muffled, q8 and uint8 are garbage or far too slow. The CPU
    // (WASM) build is correct but about 1.75x slower than real time on an Apple M4.
    dtype: "fp32",
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
      // The first generation compiles the GPU kernels. Pay that during the download bar, not on
      // the interviewer's first line, and use it to check this GPU really produces speech.
      const test = await model.generate("Welcome to your interview. Let's get started.", { voice: "af_heart" });
      const problem = audioProblem(test.audio);
      if (problem) throw new Error("Audio check failed on this device: " + problem);
      tts = model;
      postMessage({ type: "ready" });
    })
    .catch((err) => {
      loading = null;
      postMessage({ type: "error", message: err instanceof Error ? err.message : "Couldn't load the voice model." });
    });
  return loading;
}

/**
 * Rejects audio that is not speech. Measured on good output: no NaN, RMS 0.06 to 0.08,
 * zero-crossing rate 0.17 to 0.26. Broken GPU output was all NaN, or muffled (rate below 0.1).
 */
function audioProblem(a) {
  let sum = 0;
  let zc = 0;
  for (let i = 0; i < a.length; i++) {
    const v = a[i];
    if (!Number.isFinite(v)) return "not-a-number samples";
    sum += v * v;
    if (i && a[i - 1] < 0 !== v < 0) zc++;
  }
  const rms = Math.sqrt(sum / a.length);
  const rate = zc / a.length;
  if (rms < 0.02 || rms > 0.3) return "wrong loudness";
  if (rate < 0.1 || rate > 0.4) return "wrong sound texture";
  return null;
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
        // A chunk of NaN plays as static. Never let one through.
        for (let i = 0; i < audio.length; i += 64) {
          if (!Number.isFinite(audio[i])) throw new Error("Audio check failed: not-a-number samples");
        }
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
