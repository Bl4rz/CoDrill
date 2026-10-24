"use client";

import { useSyncExternalStore } from "react";

/**
 * 8-bit blips from a WebAudio square wave. Off by default, persisted in
 * localStorage, and never played before the user has touched something: the
 * AudioContext is only created inside a click, so nothing can autoplay.
 */
const KEY = "codrill:sound";

type Blip = "press" | "toggle" | "score" | "grade";

const NOTES: Record<Blip, number[]> = {
  press: [660],
  toggle: [523, 784],
  score: [440, 587],
  grade: [523, 659, 784, 1047],
};

let enabled = false;
let loaded = false;
let ctx: AudioContext | null = null;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    enabled = localStorage.getItem(KEY) === "on";
  } catch {
    enabled = false;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  load();
  return enabled;
}

export function useSoundEnabled(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

function play(kind: Blip) {
  const AudioCtor =
    typeof window !== "undefined"
      ? window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
  if (!AudioCtor) return;
  ctx ??= new AudioCtor();
  if (ctx.state === "suspended") void ctx.resume();

  const step = 0.07;
  const start = ctx.currentTime;
  NOTES[kind].forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.04, start + i * step);
    gain.gain.setValueAtTime(0, start + (i + 1) * step);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(start + i * step);
    osc.stop(start + (i + 1) * step);
  });
}

export function playBlip(kind: Blip) {
  load();
  if (!enabled) return;
  play(kind);
}

export function setSoundEnabled(next: boolean) {
  load();
  enabled = next;
  try {
    localStorage.setItem(KEY, next ? "on" : "off");
  } catch {
    // storage blocked: the toggle still works for this page view
  }
  listeners.forEach((cb) => cb());
  if (next) play("toggle");
}
