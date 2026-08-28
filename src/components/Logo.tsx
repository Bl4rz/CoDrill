interface LogoProps {
  className?: string;
}

/**
 * Brand mark: a metallic-gold ribbon coiled into a "C", unwinding into a
 * green arrow. Recreated from a reference image (icon only — the reference
 * had wordmark text baked in that we don't use). The ring's tube-like sheen
 * comes from a radialGradient centered on the ring itself: since the ring is
 * an annulus, stops placed at the inner-radius/mid/outer-radius fractions
 * naturally read as a curved metal surface without hand-drawn shading.
 * Path coordinates come from exact arc/angle geometry (a one-off node
 * script), not hand-drawn.
 */
export function Logo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="logo-ring-grad" gradientUnits="userSpaceOnUse" cx="50" cy="55" r="30">
          <stop offset="0%" stopColor="#8a5a12" />
          <stop offset="56.7%" stopColor="#8a5a12" />
          <stop offset="78.3%" stopColor="#ffe28a" />
          <stop offset="100%" stopColor="#8a5a12" />
        </radialGradient>
        <linearGradient
          id="logo-arrow-grad"
          gradientUnits="userSpaceOnUse"
          x1="62.5"
          y1="33.2"
          x2="101.7"
          y2="-2.8"
        >
          <stop offset="0%" stopColor="var(--accent-amber)" />
          <stop offset="100%" stopColor="var(--accent-green)" />
        </linearGradient>
      </defs>
      <g transform="translate(-5.4 12.6) scale(0.911)">
        <path
          d="M 65.9 80.4 A 30 30 0 1 1 61.2 27.2 L 56.4 39.2 A 17 17 0 1 0 59 69.4 Z"
          fill="url(#logo-ring-grad)"
        />
        <path
          d="M 61.2 27.2 L 87.3 5.3 L 92.6 20.5 L 101.7 -2.8 L 77.1 2.2 L 82.4 17.4 L 56.4 39.2 Z"
          fill="url(#logo-arrow-grad)"
        />
      </g>
    </svg>
  );
}
