// Hand-authored pixel-art bitmap, 16 wide x 21 tall, mirrored left/right.
// '.' = transparent, 'B' = body, 'D' = screen/outline, 'A' = accent (eyes,
// mouth, chest light, antenna tip, drill hand).
const GRID = [
  ".......AA.......",
  ".......DD.......",
  "...BBBBBBBBBB...",
  "...BBBBBBBBBB...",
  "...BBDDDDDDBB...",
  "...BBDADDADBB...",
  "...BBDDDDDDBB...",
  "...BBDDAADDBB...",
  "...BBBBBBBBBB...",
  "....BBBBBBBB....",
  "......BBBB......",
  ".BBBBBBBBBBBBBB.",
  "BBBBBBBBBBBBBBBB",
  "BBBBBBBAABBBBBBB",
  "BBBBBBBAABBBBBBB",
  "BBBBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBBAA",
  ".B.BBBBBBBBBBAD.",
  "....BBB..BBB....",
  "....BBB..BBB....",
  "....DDD..DDD....",
];

const COLORS: Record<string, string> = {
  B: "var(--accent-green)",
  D: "var(--surface)",
  A: "var(--accent-amber)",
};

const PX = 8;
const COLS = GRID[0].length;
const ROWS = GRID.length;

export function Mascot({
  className,
  title = "Codrill's mascot, a small pixel-art robot with a drill hand",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${COLS * PX} ${ROWS * PX}`}
      className={className}
      role="img"
      aria-label={title}
      shapeRendering="crispEdges"
    >
      {GRID.map((row, y) =>
        row.split("").map((cell, x) => {
          if (cell === ".") return null;
          return (
            <rect
              key={`${x}-${y}`}
              x={x * PX}
              y={y * PX}
              width={PX}
              height={PX}
              fill={COLORS[cell]}
            />
          );
        }),
      )}
    </svg>
  );
}
