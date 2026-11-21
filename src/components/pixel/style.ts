import type { CSSProperties } from "react";

/** Recolors the 3px edge of a .pixel-panel (boss red, result accent). Panels default to the line color. */
export const edgeColor = (color: string) => ({ "--edge": color }) as CSSProperties;
