import { art, type SceneKey } from "@/lib/art";

// Which art set a screen gets. The CSS in globals.css (.hero-scene) picks the
// matching whole-number scale; these media queries pick the matching images.
const SETS: { key: SceneKey; media: string | null }[] = [
  { key: "S", media: "(max-width: 480px)" },
  { key: "M", media: "(min-width: 481px) and (max-width: 900px)" },
  { key: "L", media: null }, // the <img> fallback
];

type Layer = "sky" | "land" | "stars" | "flies" | "cloudsA" | "cloudsB";

/** One layer as <picture>: phones download only the S file, desktops only the L file. */
function Layered({
  layer,
  className,
  priority,
}: {
  layer: Layer;
  className?: string;
  priority?: boolean;
}) {
  const fallback = art.scene.L[layer];
  return (
    <picture className={className}>
      {SETS.filter((s) => s.media).map((s) => (
        <source key={s.key} media={s.media!} srcSet={art.scene[s.key][layer].src} />
      ))}
      <img
        className="px"
        src={fallback.src}
        alt=""
        width={fallback.w}
        height={fallback.h}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
      />
    </picture>
  );
}

/**
 * The hero scene, assembled from pre-rendered layers: sky and land are static
 * images (the LCP element), stars and fireflies are two-frame sheets that blink
 * by sliding one image, and the two cloud layers drift a pixel at a time. All
 * motion is CSS steps() on transforms. No canvas and no JS.
 */
export function HeroScene() {
  const css = SETS.map(({ key }, i) => {
    const s = art.scene[key];
    const rule = `.hero-scene{--mx:${s.mascot.x};--my:${s.mascot.y}}`;
    if (i === 0) return rule;
    const min = i === 1 ? 481 : 901;
    return `@media (min-width:${min}px){${rule}}`;
  }).join("");

  return (
    <div className="hero-scene" aria-hidden="true">
      <style>{css}</style>
      {SETS.map(({ key, media }) => (
        <link
          key={key}
          rel="preload"
          as="image"
          href={art.scene[key].sky.src}
          media={media ?? "(min-width: 901px)"}
          fetchPriority="high"
        />
      ))}
      {SETS.map(({ key, media }) => (
        <link
          key={`${key}-land`}
          rel="preload"
          as="image"
          href={art.scene[key].land.src}
          media={media ?? "(min-width: 901px)"}
          fetchPriority="high"
        />
      ))}
      <Layered layer="sky" className="hs-layer" priority />
      <div className="hs-layer hs-blink hs-stars">
        <Layered layer="stars" />
      </div>
      <div className="hs-layer hs-clouds hs-clouds-a">
        <div className="hs-drift">
          <Layered layer="cloudsA" />
          <Layered layer="cloudsA" />
        </div>
      </div>
      <div className="hs-layer hs-clouds hs-clouds-b">
        <div className="hs-drift">
          <Layered layer="cloudsB" />
          <Layered layer="cloudsB" />
        </div>
      </div>
      <Layered layer="land" className="hs-layer" priority />
      <div className="hs-layer hs-blink hs-flies">
        <Layered layer="flies" />
      </div>
      <div className="hs-mascot">
        {/* eslint-disable-next-line @next/next/no-img-element -- pixel art must not be resampled by the image optimizer */}
        <img
          className="sprite-strip mascot-strip hs-mascot-strip"
          src={art.mascot.full.src}
          alt=""
          width={art.mascot.full.w}
          height={art.mascot.full.h}
          fetchPriority="high"
          decoding="async"
          style={{ ["--n" as string]: art.mascot.full.frames }}
        />
      </div>
    </div>
  );
}
