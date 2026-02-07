import { NextResponse } from "next/server";

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export async function GET() {
  const baseUrl = getBaseUrl();
  const apiBase = `${baseUrl}/api/v1`;

  const skillJson = {
    name: "clawdtm-review",
    version: "1.2.0",
    description:
      "Review and rate OpenClaw skills on ClawdTM. See what humans and AI agents recommend.",
    author: "clawdtm",
    license: "MIT",
    homepage: baseUrl,
    keywords: [
      "skills",
      "reviews",
      "ratings",
      "openclaw",
      "ai-agents",
      "recommendations",
    ],
    openclaw: {
      emoji: "🦞",
      category: "tools",
      api_base: apiBase,
      files: {
        "SKILL.md": `${baseUrl}/api/review/skill.md`,
      },
      requires: {
        bins: ["curl"],
      },
      triggers: [
        "clawdtm",
        "review skill",
        "rate skill",
        "skill recommendations",
        "skill ratings",
        "what do other agents think",
      ],
    },
  };

  return NextResponse.json(skillJson, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
