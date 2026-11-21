// Runs the Kokoro-82M speech model off the main thread, so the page (typewriter,
// editor, buttons) never freezes while a sentence is being generated. It is only
// ever started after a player opts in to the better voice.
import { KokoroTTS } from "kokoro-js";
import { splitSentences } from "./split";
import type { FromWorker, KokoroVoiceId, ToWorker } from "./protocol";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

const post = (message: FromWorker, transfer: Transferable[] = []) =>
  (self as unknown as { postMessage(m: unknown, t: Transferable[]): void }).postMessage(message, transfer);

let tts: KokoroTTS | null = null;
let loading: Promise<void> | null = null;
let epoch = 0;
interface Job {
  id: number;
  epoch: number;
  text: string;
  voice: KokoroVoiceId;
}
const queue: Job[] = [];
let running = false;

function load() {
  if (loading) return loading;
  const files = new Map<string, { loaded: number; total: number }>();
  loading = KokoroTTS.from_pretrained(MODEL_ID, {
    // fp16 on WebGPU is about 163 MB and runs several times faster than real time. The small
    // WASM builds (about 90 MB) were measured at ~1.75x slower than real time even on an
    // Apple M4, which would stutter, so there is deliberately no WASM fallback.
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
      if (total > 0) post({ type: "progress", pct: Math.min(99, Math.round((loaded / total) * 100)) });
    },
  })
    .then(async (model) => {
      // The first generation compiles the GPU kernels (about 3 s). Pay that now, while the
      // player is still looking at the download bar, not on the interviewer's first line.
      await model.generate("Ready.", { voice: "af_heart" });
      tts = model;
      post({ type: "ready" });
    })
    .catch((err) => {
      loading = null;
      post({ type: "error", message: err instanceof Error ? err.message : "Couldn't load the voice model." });
    });
  return loading;
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function run() {
  if (running) return;
  running = true;
  while (queue.length > 0) {
    const job = queue.shift()!;
    if (job.epoch !== epoch) continue;
    await load();
    if (!tts) break;
    for (const sentence of splitSentences(job.text)) {
      // yield so a cancel message can be handled between sentences
      await tick();
      if (job.epoch !== epoch) break;
      const started = performance.now();
      try {
        const out = await tts.generate(sentence, { voice: job.voice });
        if (job.epoch !== epoch) break;
        const audio = out.audio as Float32Array;
        post(
          { type: "chunk", id: job.id, epoch: job.epoch, audio, sampleRate: out.sampling_rate, genMs: performance.now() - started },
          [audio.buffer],
        );
      } catch (err) {
        post({ type: "error", message: err instanceof Error ? err.message : "Speech failed." });
        queue.length = 0;
        break;
      }
    }
    post({ type: "done", id: job.id, epoch: job.epoch });
  }
  running = false;
}

self.onmessage = (event: MessageEvent<ToWorker>) => {
  const msg = event.data;
  if (msg.type === "load") void load();
  else if (msg.type === "cancel") {
    epoch = msg.epoch;
    queue.length = 0;
  } else if (msg.type === "speak") {
    epoch = msg.epoch;
    queue.push({ id: msg.id, epoch: msg.epoch, text: msg.text, voice: msg.voice });
    void run();
  }
};
