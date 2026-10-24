import type { CSSProperties } from "react";

/** char -> palette variable, e.g. { B: "var(--green)" }. Any other char is transparent. */
export type SpriteColors = Record<string, string>;

/**
 * Collapses a character grid into one SVG path per color (horizontal runs
 * merged), so a sprite is a handful of path nodes instead of one <rect> per
 * pixel. Also used by the OG image, where the colors are real hex values.
 */
export function spritePaths(rows: readonly string[], colors: SpriteColors) {
  const paths = new Map<string, string>();
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (!(ch in colors)) {
        x++;
        continue;
      }
      let end = x;
      while (end < row.length && row[end] === ch) end++;
      const run = end - x;
      paths.set(ch, `${paths.get(ch) ?? ""}M${x} ${y}h${run}v1h-${run}z`);
      x = end;
    }
  });
  return [...paths.entries()].map(([ch, d]) => ({ color: colors[ch], d }));
}

export function spriteSize(rows: readonly string[]) {
  return { cols: Math.max(...rows.map((r) => r.length)), rows: rows.length };
}

/**
 * Pixel art from a character grid. Sized in multiples of --u (one "art
 * pixel", set per breakpoint in globals.css) so it always lands on whole
 * screen pixels. Pass `unit` to size it outside that system (logo, favicon).
 */
export function Sprite({
  rows,
  colors,
  scale = 1,
  unit = "var(--u)",
  className,
  style,
  title,
}: {
  rows: readonly string[];
  colors: SpriteColors;
  scale?: number;
  unit?: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  const { cols, rows: rowCount } = spriteSize(rows);
  return (
    <svg
      viewBox={`0 0 ${cols} ${rowCount}`}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      style={{
        display: "block",
        imageRendering: "pixelated",
        width: `calc(${unit} * ${cols * scale})`,
        height: `calc(${unit} * ${rowCount * scale})`,
        ...style,
      }}
    >
      {spritePaths(rows, colors).map(({ color, d }) => (
        <path key={color + d.length} d={d} style={{ fill: color }} />
      ))}
    </svg>
  );
}
