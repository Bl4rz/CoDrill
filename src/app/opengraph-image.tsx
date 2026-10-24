import { ImageResponse } from "next/og";
import { ogPieces, OG_H, OG_W } from "@/lib/og-art";
import { PALETTE } from "@/lib/palette";

export const alt = "Codrill: free mock coding interviews for the job you want";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: PALETTE.ink }}>
        <svg width={OG_W} height={OG_H} viewBox={`0 0 ${OG_W} ${OG_H}`} xmlns="http://www.w3.org/2000/svg">
          {ogPieces().map((p, i) => (
            <path key={i} d={p.d} fill={p.fill} />
          ))}
        </svg>
      </div>
    ),
    { ...size },
  );
}
