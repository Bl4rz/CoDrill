import { art } from "@/lib/art";

/**
 * "CODRILL" as pixel art. The display font draws its C like an O, which makes
 * the brand name read wrong, so the wordmark is a baked image (open C).
 * `k` is the size of one art pixel in CSS px.
 */
export function Wordmark({ k = 3, className }: { k?: number; className?: string }) {
  const w = art.wordmark;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pixel art must not be resampled by the image optimizer
    <img
      className={`px ${className ?? ""}`}
      src={w.src}
      alt="Codrill"
      width={w.w * k}
      height={w.h * k}
      style={{ width: w.w * k, height: w.h * k, maxWidth: "none" }}
      decoding="async"
    />
  );
}
