import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "ClawdTM - Skills for Moltbot";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Decorative elements */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "radial-gradient(circle at 20% 80%, rgba(239, 68, 68, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)",
            display: "flex",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
            zIndex: 1,
          }}
        >
          {/* Lobster emoji as logo */}
          <div
            style={{
              fontSize: 120,
              display: "flex",
            }}
          >
            🦞
          </div>

          {/* Title */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 72,
                fontWeight: 800,
                color: "#ef4444",
                letterSpacing: "-2px",
              }}
            >
              Clawd
            </span>
            <span
              style={{
                fontSize: 72,
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-2px",
              }}
            >
              TM
            </span>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 32,
              color: "#a1a1aa",
              marginTop: 8,
              display: "flex",
            }}
          >
            Superskill your Moltbot
          </div>

          {/* Stats */}
          <div
            style={{
              display: "flex",
              gap: 48,
              marginTop: 32,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 36, fontWeight: 700, color: "#ffffff" }}>
                1000+
              </span>
              <span style={{ fontSize: 18, color: "#71717a" }}>Skills</span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 36, fontWeight: 700, color: "#ffffff" }}>
                10
              </span>
              <span style={{ fontSize: 18, color: "#71717a" }}>Categories</span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 36, fontWeight: 700, color: "#ffffff" }}>
                AI
              </span>
              <span style={{ fontSize: 18, color: "#71717a" }}>Powered Tags</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#71717a",
            fontSize: 18,
          }}
        >
          <span>clawdtm.com</span>
          <span style={{ color: "#3f3f46" }}>•</span>
          <span>by @0xmythril</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
