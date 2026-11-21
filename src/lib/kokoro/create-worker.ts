// Kept in its own module and imported on demand: the bundler turns this URL into a
// worker chunk (transformers.js and the ONNX runtime, about 2 MB), and keeping the
// reference out of the main graph stops that machinery leaking into pages that
// never use the better voice.
export function createKokoroWorker(): Worker {
  return new Worker(new URL("./kokoro.worker.ts", import.meta.url), { type: "module" });
}
