// Typed access to the baked pixel art. The manifest is written by
// scripts/build-art.mjs (npm run art); files live in public/art with
// content-hashed names, so they can be cached forever.
import manifest from "./art-manifest.json";

export const art = manifest;
export type SceneKey = keyof typeof manifest.scene;
