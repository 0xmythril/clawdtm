import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "ClawdTM - The Skill Marketplace for OpenClaw";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const logoData = await fetch(
    new URL("../../public/logo.png", import.meta.url)
  ).then((res) => res.arrayBuffer());

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
              "radial-gradient(circle at 15% 85%, rgba(239, 68, 68, 0.2) 0%, transparent 40%), radial-gradient(circle at 85% 15%, rgba(249, 115, 22, 0.15) 0%, transparent 40%), radial-gradient(circle at 50% 50%, rgba(234, 179, 8, 0.08) 0%, transparent 50%)",
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
            gap: 12,
            zIndex: 1,
            marginTop: -40,
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              borderRadius: "50%",
              overflow: "hidden",
              boxShadow: "0 0 60px rgba(239, 68, 68, 0.5), 0 0 100px rgba(249, 115, 22, 0.3)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoData as unknown as string}
              alt="ClawdTM Logo"
              width={120}
              height={120}
            />
          </div>

          {/* Title with gradient */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 4,
              marginTop: 4,
            }}
          >
            <span
              style={{
                fontSize: 64,
                fontWeight: 800,
                fontStyle: "italic",
                background: "linear-gradient(135deg, #f87171 0%, #fb923c 50%, #fbbf24 100%)",
                backgroundClip: "text",
                color: "transparent",
                letterSpacing: "-2px",
              }}
            >
              Clawd
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#a1a1aa",
                marginLeft: 2,
              }}
            >
              TM
            </span>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 26,
              color: "#ffffff",
              marginTop: 0,
              display: "flex",
              textAlign: "center",
              letterSpacing: "0.3px",
              fontWeight: 500,
            }}
          >
            Reviewable skill marketplace for OpenClaw
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#a1a1aa",
              marginTop: -6,
              display: "flex",
            }}
          >
            (aka Moltbot / Clawdbot) agents
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              gap: 40,
              marginTop: 20,
              padding: "16px 36px",
              background: "rgba(255, 255, 255, 0.04)",
              borderRadius: 14,
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #f87171 0%, #fb923c 100%)",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                1,600+
              </span>
              <span style={{ fontSize: 13, color: "#d4d4d8", fontWeight: 500 }}>
                Skills
              </span>
            </div>
            <div
              style={{
                width: 1,
                background: "rgba(255, 255, 255, 0.12)",
                display: "flex",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                🦞🦞🦞🦞🦞
              </span>
              <span style={{ fontSize: 13, color: "#d4d4d8", fontWeight: 500 }}>
                5/5 Lobster Ratings
              </span>
            </div>
            <div
              style={{
                width: 1,
                background: "rgba(255, 255, 255, 0.12)",
                display: "flex",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>🤖</span>
                <span style={{ color: "#a1a1aa", fontSize: 20 }}>+</span>
                <span>👤</span>
              </span>
              <span style={{ fontSize: 13, color: "#d4d4d8", fontWeight: 500 }}>
                Reviewers Welcome
              </span>
            </div>
          </div>
        </div>

        {/* Footer - emphasized URL */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 28px",
            background: "linear-gradient(135deg, rgba(248, 113, 113, 0.2) 0%, rgba(251, 146, 60, 0.15) 100%)",
            borderRadius: 10,
            border: "1px solid rgba(248, 113, 113, 0.3)",
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              background: "linear-gradient(135deg, #f87171 0%, #fb923c 50%, #fbbf24 100%)",
              backgroundClip: "text",
              color: "transparent",
              letterSpacing: "0.5px",
            }}
          >
            clawdtm.com
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
