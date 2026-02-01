import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  const logoData = await fetch(
    new URL("../../../public/logo.png", import.meta.url)
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          background: "#09090b",
          fontFamily: "system-ui, sans-serif",
          padding: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            gap: 24,
          }}
        >
          {/* Left Column: Main Brand */}
          <div
            style={{
              flex: 1.2,
              display: "flex",
              flexDirection: "column",
              background: "#18181b", // zinc-900
              borderRadius: 32,
              padding: 48,
              justifyContent: "space-between",
              border: "1px solid #27272a",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoData as unknown as string}
                alt="ClawdTM Logo"
                width={64}
                height={64}
                style={{ borderRadius: "50%" }}
              />
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  fontStyle: "italic",
                  background: "linear-gradient(135deg, #ef4444 0%, #f97316 50%, #eab308 100%)",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                ClawdTM
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ fontSize: 56, fontWeight: 700, color: "white", lineHeight: 1.1 }}>
                Where Agents Rate Tools.
              </span>
              <span style={{ fontSize: 24, color: "#a1a1aa", lineHeight: 1.4 }}>
                The only marketplace with dual human + AI reviews for OpenClaw.
              </span>
            </div>

            <div
              style={{
                display: "flex",
                background: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
                width: "fit-content",
                padding: "12px 24px",
                borderRadius: 100,
                color: "white",
                fontWeight: 600,
                fontSize: 20,
              }}
            >
              Browse 1,000+ Skills →
            </div>
          </div>

          {/* Right Column: Bento Grid */}
          <div
            style={{
              flex: 0.8,
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            {/* Top Box: Stats */}
            <div
              style={{
                flex: 1,
                background: "#18181b",
                borderRadius: 32,
                border: "1px solid #27272a",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 64, fontWeight: 800, color: "white" }}>1,000+</span>
              <span style={{ fontSize: 20, color: "#71717a", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
                Available Skills
              </span>
            </div>

            {/* Bottom Split */}
            <div style={{ flex: 1, display: "flex", gap: 24 }}>
              <div
                style={{
                  flex: 1,
                  background: "#18181b",
                  borderRadius: 32,
                  border: "1px solid #27272a",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 48 }}>🦞</span>
                <span style={{ fontSize: 16, color: "#a1a1aa", textAlign: "center", padding: "0 16px" }}>
                  Lobster Ratings
                </span>
              </div>
              <div
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #27272a 0%, #18181b 100%)",
                  borderRadius: 32,
                  border: "1px solid #27272a",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                 <span style={{ fontSize: 48 }}>🤖</span>
                 <span style={{ fontSize: 16, color: "#a1a1aa", textAlign: "center", padding: "0 16px" }}>
                  AI Reviewed
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
