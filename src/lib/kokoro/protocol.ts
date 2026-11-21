// Messages between the page and the Kokoro worker.

export const KOKORO_VOICES = [
  { id: "af_heart", label: "Heart (US, woman)" },
  { id: "am_michael", label: "Michael (US, man)" },
  { id: "bf_emma", label: "Emma (UK, woman)" },
  { id: "bm_george", label: "George (UK, man)" },
] as const;
export type KokoroVoiceId = (typeof KOKORO_VOICES)[number]["id"];

export type ToWorker =
  | { type: "load" }
  | { type: "speak"; id: number; epoch: number; sentences: string[]; voice: KokoroVoiceId }
  | { type: "cancel"; epoch: number };

export type FromWorker =
  | { type: "progress"; pct: number }
  | { type: "ready" }
  | { type: "error"; message: string }
  | { type: "chunk"; id: number; epoch: number; audio: Float32Array; sampleRate: number; genMs: number }
  | { type: "done"; id: number; epoch: number };
