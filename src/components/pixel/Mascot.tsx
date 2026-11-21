import type { CSSProperties } from "react";
import { art } from "@/lib/art";

export type Expression = "neutral" | "thinking" | "impressed" | "concerned";

/**
 * The Codrill robot, drawn from the baked sprite sheet. `k` is the size of one
 * art pixel in CSS pixels: always a whole number, so the art never blurs. The
 * sheet is an <img> inside a clipped box; CSS slides it frame by frame with
 * steps(), which is a transform and costs no JS. Reduced-motion users get the
 * first frame (globals.css turns every animation off).
 */
export function Mascot({
  expression = "neutral",
  crop = "full",
  k,
  priority = false,
  className,
  title = "Codrill's mascot, a small pixel robot with a drill antenna",
}: {
  expression?: Expression;
  crop?: "full" | "head";
  /** Size of one art pixel in CSS px (whole number). Omit to inherit --k from CSS. */
  k?: number;
  priority?: boolean;
  className?: string;
  title?: string;
}) {
  const m = art.mascot;
  const head = crop === "head";
  const sheet = head ? m.head : m.body;
  const frames = sheet.frames;
  const fh = sheet.fh;
  const row = (sheet.rows as Record<string, number>)[expression] ?? 0;
  const rows = Object.keys(sheet.rows).length;
  const style = {
    ...(k ? { "--k": k } : null),
    "--n": frames,
    width: `calc(var(--k, 2) * ${m.fw}px)`,
    height: `calc(var(--k, 2) * ${fh}px)`,
  } as CSSProperties;
  return (
    <span
      className={`sprite-box ${className ?? ""}`}
      style={style}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- pixel art must not be resampled by the image optimizer */}
      <img
        className="sprite-strip mascot-strip"
        src={sheet.src}
        alt=""
        width={sheet.w}
        height={sheet.h}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        style={{
          width: `calc(var(--k, 2) * ${sheet.w}px)`,
          height: `calc(var(--k, 2) * ${fh * rows}px)`,
          marginTop: row ? `calc(var(--k, 2) * ${-fh * row}px)` : undefined,
        }}
      />
    </span>
  );
}

export { art };
