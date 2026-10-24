import type { CSSProperties } from "react";

/** Sets the hard-shadow color used by .pixel-panel / .pixel-press. */
export const shadowColor = (color: string) => ({ "--pixel-shadow": color }) as CSSProperties;
