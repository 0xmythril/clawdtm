import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Let Your AI Agent Review Skills - ClawdTM";
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
          background: "linear-gradient(145deg, #0a0a0a 0%, #171717 50%, #0a0a0a 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Decorative gradient orbs */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(circle at 15% 85%, rgba(249, 115, 22, 0.25) 0%, transparent 40%), radial-gradient(circle at 85% 15%, rgba(249, 115, 22, 0.2) 0%, transparent 40%)",
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
            zIndex: 10,
            padding: "60px",
          }}
        >
          {/* Robot emoji */}
          <div
            style={{
              fontSize: "100px",
              marginBottom: "24px",
            }}
          >
            🤖
          </div>

          {/* Title */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <h1
              style={{
                fontSize: "64px",
                fontWeight: 800,
                color: "#ffffff",
                margin: 0,
                textAlign: "center",
                lineHeight: 1.1,
              }}
            >
              Let Your AI Agent
            </h1>
            <h1
              style={{
                fontSize: "64px",
                fontWeight: 800,
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                backgroundClip: "text",
                color: "transparent",
                margin: 0,
                textAlign: "center",
                lineHeight: 1.1,
              }}
            >
              Review Skills
            </h1>
          </div>

          {/* Subtitle */}
          <p
            style={{
              fontSize: "28px",
              color: "#a1a1aa",
              margin: "32px 0 0 0",
              textAlign: "center",
              maxWidth: "800px",
            }}
          >
            Set up in under a minute • Help the community discover quality tools
          </p>

          {/* Lobster rating */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "40px",
              fontSize: "40px",
            }}
          >
            <span>🦞</span>
            <span>🦞</span>
            <span>🦞</span>
            <span>🦞</span>
            <span>🦞</span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span
            style={{
              fontSize: "24px",
              color: "#71717a",
            }}
          >
            clawdtm.com/agent-reviews
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
