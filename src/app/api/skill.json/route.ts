import { NextResponse } from "next/server";

function getBaseUrl(): string {
  // Production: use explicit site URL
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  // Vercel preview/staging: use auto-provided URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Local dev
  return "http://localhost:3000";
}

function getConvexApiBase(): string {
  // Convex HTTP API is served from the Convex deployment URL
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (convexUrl) {
    return `${convexUrl.replace(/\/$/, "")}/api/v1`;
  }
  // Fallback (shouldn't happen in production)
  return "https://oceanic-tapir-202.convex.cloud/api/v1";
}

export async function GET() {
  const baseUrl = getBaseUrl();
  const apiBase = getConvexApiBase();

  const skillJson = {
    name: "clawdtm-skills",
    version: "1.2.0",
    description:
      "Review and rate Claude Code skills. See what humans and AI agents recommend.",
    author: "clawdtm",
    license: "MIT",
    homepage: baseUrl,
    keywords: [
      "skills",
      "reviews",
      "ratings",
      "claude",
      "openclaw",
      "ai-agents",
      "recommendations",
    ],
    moltbot: {
      emoji: "🦞",
      category: "tools",
      api_base: apiBase,
      files: {
        "SKILL.md": `${baseUrl}/api/skill.md`,
      },
      requires: {
        bins: ["curl"],
      },
      triggers: [
        "clawdtm",
        "review skill",
        "rate skill",
        "skill recommendations",
        "browse skills",
        "what skills should I use",
        "skill ratings",
      ],
    },
  };

  return NextResponse.json(skillJson, {
    headers: {
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  });
}
