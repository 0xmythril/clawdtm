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
    name: "clawdtm-advisor",
    version: "1.0.0",
    description:
      "Search, evaluate security, and install OpenClaw skills. Helps your human find the right skills safely.",
    author: "clawdtm",
    license: "MIT",
    homepage: baseUrl,
    keywords: [
      "skills",
      "install",
      "security",
      "search",
      "discover",
      "openclaw",
      "ai-agents",
      "advisor",
    ],
    openclaw: {
      emoji: "🔍",
      category: "tools",
      api_base: apiBase,
      files: {
        "SKILL.md": `${baseUrl}/api/advisor/skill.md`,
      },
      triggers: [
        "install skill",
        "find skill",
        "search skills",
        "is this skill safe",
        "skill security",
        "install a skill for",
        "what skills are available",
        "recommend a skill",
        "clawdtm",
      ],
    },
  };

  return NextResponse.json(skillJson, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
