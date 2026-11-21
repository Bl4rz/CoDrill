"use client";

// The page side of the opt-in Kokoro voice: owns the worker, the download state,
// and playback. One shared instance, so moving between levels doesn't reload the
// model or lose the player's choice. Nothing here runs until a player turns the
// better voice on (or had it on in an earlier visit).
import { useSyncExternalStore } from "react";
import { KOKORO_VOICES, type FromWorker, type KokoroVoiceId, type ToWorker } from "./protocol";
import { splitSentences } from "./split";

const KEY_ON = "codrill:kokoro-on";
const KEY_VOICE = "codrill:kokoro-voice";
const KEY_SLOW = "codrill:kokoro-slow";

export type KokoroStatus = "off" | "loading" | "ready" | "failed";

export interface KokoroState {
  /** null until the device check has run; true only where a WebGPU adapter is available */
  supported: boolean | null;
  status: KokoroStatus;
  /** 0-100 while the model downloads */
  pct: number;
  voice: KokoroVoiceId;
  speaking: boolean;
  /** Why it is not available, in plain words, once it has failed */
  message: string | null;
}

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // private mode: the choice just doesn't persist
  }
};

const SERVER_STATE: KokoroState = { supported: null, status: "off", pct: 0, voice: "af_heart", speaking: false, message: null };
let state: KokoroState = SERVER_STATE;
let initialised = false;
const listeners = new Set<() => void>();
const set = (patch: Partial<KokoroState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

let worker: Worker | null = null;
let ctx: AudioContext | null = null;
let epoch = 0;
let nextId = 1;
let pendingJobs = 0;
let nextStart = 0;
let sources: AudioBufferSourceNode[] = [];
let slowChunks = 0;

/**
 * Can this device run it fast enough? Needs a Worker, Web Audio and a WebGPU adapter. Everything
 * else keeps the standard voice, because the CPU (WASM) build is slower than real time. This only
 * asks the browser; nothing downloads. Whether the GPU then produces real speech is checked by the
 * worker after the download.
 */
async function probeSupport(): Promise<boolean> {
  if (typeof Worker === "undefined") return false;
  if (!("AudioContext" in window || "webkitAudioContext" in window)) return false;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (mem !== undefined && mem < 4) return false;
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<object | null> } }).gpu;
  if (!gpu) return false;
  try {
    const adapter = await gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

function audioContext(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

const send = (message: ToWorker) => worker?.postMessage(message);

function refreshSpeaking() {
  set({ speaking: pendingJobs > 0 || sources.length > 0 });
}

function fail(message: string) {
  stopPlayback();
  worker?.terminate();
  worker = null;
  write(KEY_ON, null);
  set({ status: "failed", message, pct: 0, speaking: false });
}

function startWorker() {
  if (worker) return;
  // A plain module worker served from /public: no bundler involved, so none of the speech
  // runtime lands in the site's own JavaScript.
  try {
    attach(new Worker("/kokoro-worker.js", { type: "module" }));
  } catch {
    fail("The better voice couldn't start, so the standard voice is back.");
  }
}

function attach(w: Worker) {
  worker = w;
  worker.onmessage = (event: MessageEvent<FromWorker>) => {
    const msg = event.data;
    if (msg.type === "progress") set({ pct: msg.pct });
    else if (msg.type === "ready") set({ status: "ready", pct: 100, message: null });
    else if (msg.type === "error") fail("The better voice couldn't run here, so the standard voice is back.");
    else if (msg.type === "chunk") onChunk(msg);
    else if (msg.type === "done") {
      if (msg.epoch === epoch) pendingJobs = Math.max(0, pendingJobs - 1);
      refreshSpeaking();
    }
  };
  worker.onerror = () => fail("The better voice couldn't run here, so the standard voice is back.");
  send({ type: "load" });
}

function onChunk(msg: Extract<FromWorker, { type: "chunk" }>) {
  if (msg.epoch !== epoch) return;
  const audioCtx = audioContext();
  const buffer = audioCtx.createBuffer(1, msg.audio.length, msg.sampleRate);
  buffer.copyToChannel(msg.audio as Float32Array<ArrayBuffer>, 0);

  // If generating a sentence takes clearly longer than playing it, the voice would stutter
  // on this device. Two such sentences in a row and we give up and fall back.
  const seconds = buffer.duration;
  slowChunks = msg.genMs > seconds * 1000 * 1.5 ? slowChunks + 1 : 0;
  if (slowChunks >= 2) {
    write(KEY_SLOW, "1");
    fail("This device is too slow for the better voice, so the standard voice is back.");
    return;
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  const startAt = Math.max(audioCtx.currentTime + 0.04, nextStart);
  source.start(startAt);
  nextStart = startAt + buffer.duration;
  sources.push(source);
  source.onended = () => {
    sources = sources.filter((s) => s !== source);
    refreshSpeaking();
  };
  refreshSpeaking();
}

function stopPlayback() {
  epoch += 1;
  pendingJobs = 0;
  nextStart = 0;
  for (const s of sources) {
    s.onended = null;
    try {
      s.stop();
    } catch {
      // already stopped
    }
  }
  sources = [];
}

function init() {
  if (initialised || typeof window === "undefined") return;
  initialised = true;
  const stored = read(KEY_VOICE);
  const voice = KOKORO_VOICES.find((v) => v.id === stored)?.id ?? "af_heart";
  state = { ...state, voice };
  if (read(KEY_SLOW) === "1") {
    state = { ...state, status: "failed", message: "This device was too slow for the better voice." };
  }
  void probeSupport().then((supported) => {
    set({ supported });
    if (supported && state.status === "off" && read(KEY_ON) === "1") {
      // They opted in on an earlier visit; the model is in the browser cache, so this is quick.
      set({ status: "loading" });
      startWorker();
    }
  });
}

export const kokoro = {
  /** Call from a click: the download is the player's choice, and audio needs a gesture on iOS. */
  enable() {
    if (state.supported !== true) {
      set({ status: "failed", message: "This device can't run the better voice." });
      return;
    }
    write(KEY_SLOW, null);
    write(KEY_ON, "1");
    audioContext();
    slowChunks = 0;
    set({ status: state.status === "ready" ? "ready" : "loading", message: null });
    startWorker();
  },
  /** Back to the standard voice. The model stays cached in the browser. */
  disable() {
    stopPlayback();
    worker?.terminate();
    worker = null;
    write(KEY_ON, null);
    set({ status: "off", speaking: false });
  },
  speak(text: string) {
    if (state.status !== "ready" || !worker) return;
    audioContext();
    const sentences = splitSentences(text);
    if (sentences.length === 0) return;
    pendingJobs += 1;
    send({ type: "speak", id: nextId++, epoch, sentences, voice: state.voice });
    refreshSpeaking();
  },
  cancel() {
    if (!worker) return;
    stopPlayback();
    send({ type: "cancel", epoch });
    refreshSpeaking();
  },
  setVoice(voice: KokoroVoiceId) {
    write(KEY_VOICE, voice);
    set({ voice });
  },
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => {
  init();
  return state;
};

export function useKokoro(): KokoroState {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_STATE);
}
