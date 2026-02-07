import { NextRequest, NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../../convex/_generated/api";

// File extensions worth fetching from GitHub (matches security.ts scannable list + SKILL.md)
const FETCHABLE_EXTENSIONS = new Set([
  '.md', '.txt', '.py', '.js', '.mjs', '.ts', '.sh', '.bash',
  '.json', '.yaml', '.yml', '.toml', '.cfg', '.ini', '.conf',
]);

function isFetchable(filename: string): boolean {
  const lower = filename.toLowerCase();
  return FETCHABLE_EXTENSIONS.has(
    '.' + lower.split('.').pop()
  ) || lower === 'skill.md';
}

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'ClawdTM-Install/1.0',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  return headers;
}

interface GitHubItem {
  name: string;
  type: 'file' | 'dir';
  path: string;
}

interface SkillFile {
  path: string;
  content: string;
}

async function fetchSkillFiles(
  author: string,
  slug: string
): Promise<SkillFile[] | null> {
  const basePath = `skills/${author}/${slug}`;
  const headers = getGitHubHeaders();

  try {
    // 1. Get directory listing
    const listUrl = `https://api.github.com/repos/openclaw/skills/contents/${basePath}`;
    const listResponse = await fetch(listUrl, { headers });

    if (!listResponse.ok) {
      if (listResponse.status === 403) {
        // Rate limited
        return null;
      }
      return null;
    }

    const items: GitHubItem[] = await listResponse.json();
    const files: SkillFile[] = [];

    // 2. Fetch each fetchable file
    for (const item of items) {
      if (item.type !== 'file') continue;
      if (!isFetchable(item.name)) continue;
      if (item.name === '_meta.json') continue;

      const rawUrl = `https://raw.githubusercontent.com/openclaw/skills/main/${basePath}/${item.name}`;
      const contentResponse = await fetch(rawUrl);
      if (contentResponse.ok) {
        const content = await contentResponse.text();
        files.push({ path: item.name, content });
      }
    }

    // 3. Check subdirectories (e.g., scripts/)
    for (const item of items) {
      if (item.type !== 'dir') continue;

      const subUrl = `https://api.github.com/repos/openclaw/skills/contents/${basePath}/${item.name}`;
      const subResponse = await fetch(subUrl, { headers });
      if (!subResponse.ok) continue;

      const subItems: GitHubItem[] = await subResponse.json();
      for (const subItem of subItems) {
        if (subItem.type !== 'file') continue;
        if (!isFetchable(subItem.name)) continue;

        const rawUrl = `https://raw.githubusercontent.com/openclaw/skills/main/${basePath}/${item.name}/${subItem.name}`;
        const contentResponse = await fetch(rawUrl);
        if (contentResponse.ok) {
          const content = await contentResponse.text();
          files.push({ path: `${item.name}/${subItem.name}`, content });
        }
      }
    }

    return files;
  } catch (error) {
    console.error(`[Install API] Failed to fetch files for ${author}/${slug}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');

  if (!slug || !slug.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required parameter: slug',
        hint: 'Provide the skill slug, e.g. ?slug=memory-bank',
      },
      { status: 400 }
    );
  }

  const acknowledgeRisk = request.nextUrl.searchParams.get('acknowledge_risk') === 'true';

  // Look up skill in cachedSkills (filters hidden automatically)
  const skill = await fetchQuery(api.reviews.getSkillBySlug, { slug: slug.trim() });

  if (!skill) {
    return NextResponse.json(
      {
        success: false,
        error: 'Skill not found',
        hint: `No skill with slug "${slug.trim()}"`,
      },
      { status: 404 }
    );
  }

  // Block high-risk skills (score < 50) unless caller explicitly acknowledges risk
  if (
    skill.securityScore !== undefined &&
    skill.securityScore < 50 &&
    !acknowledgeRisk
  ) {
    return NextResponse.json(
      {
        success: false,
        error: 'Skill blocked due to high security risk',
        security: {
          score: skill.securityScore,
          risk: skill.securityRisk ?? 'high',
          flags: skill.securityFlags ?? [],
        },
        hint: 'This skill has a security score below 50 (high or critical risk). To install anyway, add &acknowledge_risk=true to the request.',
      },
      {
        status: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    );
  }

  // Build response with security + community data
  const response: Record<string, unknown> = {
    success: true,
    skill: {
      slug: skill.slug,
      name: skill.name,
      author: skill.author,
      description: skill.description,
      category: skill.category ?? null,
      version: skill.version ?? null,
    },
    security: {
      score: skill.securityScore ?? null,
      risk: skill.securityRisk ?? null,
      flags: skill.securityFlags ?? [],
      last_scanned_at: skill.lastSecurityScanAt ?? null,
    },
    community: {
      avg_rating: skill.avgRating ?? null,
      review_count: skill.reviewCount ?? 0,
      human_reviews: skill.humanReviewCount ?? 0,
      bot_reviews: skill.botReviewCount ?? 0,
      is_verified: false, // getSkillBySlug doesn't return these, default to false
      is_featured: false,
    },
    install_to: `./skills/${skill.slug}/`,
  };

  // Fetch files from GitHub if we know the author
  if (skill.author && skill.author !== 'Unknown' && skill.author !== 'unknown') {
    const files = await fetchSkillFiles(skill.author, skill.slug);

    if (files !== null) {
      response.files = files;
    } else {
      response.files = null;
      response.files_hint =
        'Could not fetch files from GitHub. Use `clawhub install ' +
        skill.slug +
        '` as an alternative.';
    }
  } else {
    response.files = null;
    response.files_hint =
      'Author unknown — cannot fetch files from GitHub. Use `clawhub install ' +
      skill.slug +
      '` instead.';
  }

  return NextResponse.json(response, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300', // Cache 5 minutes
    },
  });
}
