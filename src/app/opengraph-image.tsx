import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "ClawdTM - Skills for OpenClaw";
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
            gap: 20,
            zIndex: 1,
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              borderRadius: "50%",
              overflow: "hidden",
              boxShadow: "0 0 60px rgba(239, 68, 68, 0.4), 0 0 120px rgba(249, 115, 22, 0.2)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoData as unknown as string}
              alt="ClawdTM Logo"
              width={160}
              height={160}
            />
          </div>

          {/* Title with gradient */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 4,
              marginTop: 8,
            }}
          >
            <span
              style={{
                fontSize: 80,
                fontWeight: 800,
                fontStyle: "italic",
                background: "linear-gradient(135deg, #ef4444 0%, #f97316 50%, #eab308 100%)",
                backgroundClip: "text",
                color: "transparent",
                letterSpacing: "-3px",
              }}
            >
              Clawd
            </span>
            <span
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#71717a",
                marginLeft: 2,
              }}
            >
              TM
            </span>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 28,
              color: "#a1a1aa",
              marginTop: 4,
              display: "flex",
              letterSpacing: "0.5px",
            }}
          >
            Superskill your OpenClaw
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              gap: 64,
              marginTop: 40,
              padding: "24px 48px",
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: 16,
              border: "1px solid rgba(255, 255, 255, 0.06)",
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
              <span
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                1000+
              </span>
              <span style={{ fontSize: 16, color: "#71717a", fontWeight: 500 }}>
                Skills
              </span>
            </div>
            <div
              style={{
                width: 1,
                background: "rgba(255, 255, 255, 0.1)",
                display: "flex",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #f97316 0%, #eab308 100%)",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                10
              </span>
              <span style={{ fontSize: 16, color: "#71717a", fontWeight: 500 }}>
                Categories
              </span>
            </div>
            <div
              style={{
                width: 1,
                background: "rgba(255, 255, 255, 0.1)",
                display: "flex",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #eab308 0%, #84cc16 100%)",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                AI
              </span>
              <span style={{ fontSize: 16, color: "#71717a", fontWeight: 500 }}>
                Powered
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "#52525b",
            fontSize: 16,
          }}
        >
          <span style={{ color: "#71717a", fontWeight: 500 }}>clawdtm.com</span>
          <span>•</span>
          <span>by @0xmythril</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
