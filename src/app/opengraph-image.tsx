import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION } from "@/lib/site";
import { PALETTE } from "@/lib/palette";

export const alt = "Codrill: free mock coding interviews for the job you want";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: PALETTE.ink,
        }}
      >
        <span style={{ fontSize: 96, fontWeight: 700, color: PALETTE.paper }}>CODRILL</span>
        <span style={{ fontSize: 36, color: PALETTE.green, marginTop: 24 }}>
          Practice the interview for the job you actually want.
        </span>
        <span style={{ fontSize: 24, color: PALETTE.paper, marginTop: 28, maxWidth: 900 }}>
          {SITE_DESCRIPTION}
        </span>
      </div>
    ),
    { ...size },
  );
}
