import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION } from "@/lib/site";

export const alt = "Codrill — AI Mock Technical Interviews";
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
          background: "linear-gradient(135deg, #0c130f 0%, #142019 60%, #1b2a20 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="72" height="72" viewBox="0 0 100 100">
            <path
              d="M 65.9 80.4 A 30 30 0 1 1 61.2 27.2 L 56.4 39.2 A 17 17 0 1 0 59 69.4 Z"
              fill="#f5a623"
            />
            <path
              d="M 61.2 27.2 L 87.3 5.3 L 92.6 20.5 L 101.7 -2.8 L 77.1 2.2 L 82.4 17.4 L 56.4 39.2 Z"
              fill="#4ade80"
            />
          </svg>
          <span style={{ fontSize: 56, fontWeight: 700, color: "#eef6ef" }}>Codrill</span>
        </div>
        <div style={{ display: "flex", marginTop: 48 }}>
          <span style={{ fontSize: 40, fontWeight: 600, color: "#eef6ef", lineHeight: 1.3 }}>
            Practice the interview for the job you actually want.
          </span>
        </div>
        <div style={{ display: "flex", marginTop: 28, maxWidth: 900 }}>
          <span style={{ fontSize: 24, color: "#93a698", lineHeight: 1.5 }}>
            {SITE_DESCRIPTION}
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
