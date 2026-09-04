import { Starfield } from "@/components/landing/Starfield";

/**
 * Site-wide backdrop: ambient color wash + starfield. Replaces the old
 * FlowingThreads "wavy ribbon" with something that fits the retro-game
 * identity the rest of the site (mascot, pixel font, pixel-panel chrome)
 * already commits to.
 *
 * The perspective grid floor lives in the hero only (see page.tsx), not
 * here — this layer is `fixed`, so anything drawn with a hard edge (a
 * horizon line, grid lines) stays pinned at the same screen position while
 * the page scrolls underneath it and ends up cutting across whatever
 * heading happens to land there. Stars and soft glow don't have that
 * problem; sharp lines do.
 *
 * Built from cheap primitives only: plain gradients, no SVG filters, no
 * blur regions. That's not a style choice, it's a lesson already paid for
 * once — FlowingThreads' feGaussianBlur-filtered paths crashed WebKit on a
 * real iPhone, which is why it needed a whole separate mobile-safe
 * fallback. This background doesn't need one — it's the same weight
 * everywhere.
 */
export function SiteBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 20% 15%, color-mix(in srgb, var(--accent-green) 22%, transparent) 0%, transparent 70%)," +
            "radial-gradient(ellipse 65% 40% at 85% 85%, color-mix(in srgb, var(--accent-amber) 18%, transparent) 0%, transparent 70%)," +
            "var(--background)",
        }}
      />
      <Starfield className="opacity-80" />
    </div>
  );
}
