"use client";

import Link from "next/link";
import { Star, Download, Terminal, ExternalLink, BadgeCheck, ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackExternalLink } from "@/lib/analytics";

// Tag color palette
const TAG_COLORS = [
  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export type ReviewerFilter = "all" | "human" | "bot";

export type SecurityRisk = "safe" | "low" | "medium" | "high" | "critical";

export type Skill = {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  author: string;
  downloads: number;
  stars: number;
  installs: number;
  category?: string;
  normalizedTags?: string[];
  isVerified?: boolean;
  // Legacy votes (deprecated, but still in data)
  clawdtmUpvotes?: number;
  clawdtmDownvotes?: number;
  // Review stats
  reviewCount?: number;
  humanReviewCount?: number;
  botReviewCount?: number;
  avgRating?: number;
  avgRatingHuman?: number;
  avgRatingBot?: number;
  // Security
  securityScore?: number;
  securityRisk?: SecurityRisk;
  securityFlags?: string[];
  lastSecurityScanAt?: number;
};

type SkillCardProps = {
  skill: Skill;
  onInstall: (skill: Skill) => void;
  variant?: "card" | "list";
  // User's current rating for this skill (1-5 or null)
  userRating?: number | null;
  // For onboarding tour - marks first card
  isFirstCard?: boolean;
  // Filter to show only human or bot ratings
  reviewerFilter?: ReviewerFilter;
};

// Security badge component
function SecurityBadge({ 
  risk, 
  score,
  size = "sm" 
}: { 
  risk?: SecurityRisk; 
  score?: number;
  size?: "sm" | "md";
}) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  
  if (!risk) {
    // Not scanned yet - don't show anything to avoid clutter
    return null;
  }
  
  const config = {
    safe: { 
      icon: ShieldCheck, 
      color: "text-green-500", 
      label: "Safe",
      tooltip: `Security: Safe (${score}/100)` 
    },
    low: { 
      icon: ShieldCheck, 
      color: "text-green-600", 
      label: "Low risk",
      tooltip: `Security: Low risk (${score}/100)` 
    },
    medium: { 
      icon: Shield, 
      color: "text-yellow-500", 
      label: "Medium risk",
      tooltip: `Security: Medium risk (${score}/100) - Review recommended` 
    },
    high: { 
      icon: ShieldAlert, 
      color: "text-orange-500", 
      label: "High risk",
      tooltip: `Security: High risk (${score}/100) - Use with caution` 
    },
    critical: { 
      icon: ShieldAlert, 
      color: "text-red-500", 
      label: "Critical",
      tooltip: `Security: Critical risk (${score}/100) - Potential malware` 
    },
  };
  
  const { icon: Icon, color, tooltip } = config[risk];
  
  return (
    <span title={tooltip} className={color}>
      <Icon className={iconSize} />
    </span>
  );
}

// Rating display component using lobster emoji
function RatingDisplay({ 
  avgRating, 
  avgRatingHuman,
  avgRatingBot,
  reviewCount, 
  humanReviewCount, 
  botReviewCount, 
  userRating, 
  reviewerFilter = "all",
  size = "sm", 
  dataTour 
}: {
  avgRating: number | null;
  avgRatingHuman?: number | null;
  avgRatingBot?: number | null;
  reviewCount: number;
  humanReviewCount?: number;
  botReviewCount?: number;
  userRating?: number | null;
  reviewerFilter?: ReviewerFilter;
  size?: "sm" | "md";
  dataTour?: string;
}) {
  const humanCount = humanReviewCount ?? 0;
  const botCount = botReviewCount ?? 0;
  
  // Select rating and count based on filter
  const displayRating = reviewerFilter === "human" 
    ? (avgRatingHuman ?? null)
    : reviewerFilter === "bot"
      ? (avgRatingBot ?? null)
      : avgRating;
  
  const displayCount = reviewerFilter === "human"
    ? humanCount
    : reviewerFilter === "bot"
      ? botCount
      : reviewCount;
  
  const hasRating = displayRating !== null && displayCount > 0;
  const iconSize = size === "sm" ? "text-sm" : "text-base";
  const hasAnyReviews = humanCount > 0 || botCount > 0;
  
  // Build tooltip with breakdown (always show breakdown in tooltip for context)
  const filterLabel = reviewerFilter === "human" ? " (Human only)" : reviewerFilter === "bot" ? " (AI only)" : "";
  const tooltip = hasRating 
    ? `${displayRating?.toFixed(1)} avg from ${displayCount} reviews${filterLabel}${hasAnyReviews ? ` (${humanCount} human, ${botCount} AI)` : ''}`
    : reviewerFilter === "all" ? "No reviews yet" : `No ${reviewerFilter} reviews yet`;
  
  return (
    <div className="flex items-center gap-1" title={tooltip} {...(dataTour ? { "data-tour": dataTour } : {})}>
      <span className={iconSize}>🦞</span>
      {hasRating ? (
        <span className="font-medium text-orange-600 dark:text-orange-400">
          {displayRating?.toFixed(1)}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
      {/* Show user's rating star before count */}
      {userRating && (
        <span className="text-orange-500" title={`Your rating: ${userRating}`}>
          ★
        </span>
      )}
      {/* Always show breakdown for better context at a glance */}
      {hasAnyReviews ? (
        <span className="text-muted-foreground text-xs">
          (<span title="Human reviews">👤{humanCount}</span>
          <span className="mx-0.5">·</span>
          <span title="AI reviews">🤖{botCount}</span>)
        </span>
      ) : (
        <span className="text-muted-foreground">(0)</span>
      )}
    </div>
  );
}

export function SkillCard({ skill, onInstall, variant = "card", userRating, isFirstCard, reviewerFilter = "all" }: SkillCardProps) {
  const tags = skill.normalizedTags?.slice(0, 3) ?? [];

  if (variant === "list") {
    return (
      <Card className="group overflow-hidden transition-all hover:shadow-md hover:border-primary/20 py-3 gap-0" {...(isFirstCard ? { "data-tour": "skill-card" } : {})}>
        <CardContent className="p-4">
          <div className="flex gap-4 items-start">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-start gap-2 mb-1">
                <Link href={`/skills/${skill.slug}`} className="min-w-0">
                  <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors flex items-center gap-1">
                    {skill.name || skill.slug}
                    {skill.isVerified && (
                      <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />
                    )}
                    <SecurityBadge risk={skill.securityRisk} score={skill.securityScore} />
                  </h3>
                </Link>
                {skill.category && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {skill.category}
                  </Badge>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground mb-2">
                /{skill.slug} · by {skill.author}
              </p>

              {/* Description */}
              <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                {skill.description || "Agent-ready skill pack for Claude Code."}
              </p>

              {/* Tags + Stats row */}
              <div className="flex items-center gap-3 flex-wrap text-xs">
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className={`text-xs px-1.5 py-0 border-0 ${getTagColor(tag)}`}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {skill.stars}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {skill.downloads}
                  </span>
                  <span className="flex items-center gap-1">
                    <Terminal className="h-3 w-3" />
                    {skill.installs > 0 ? skill.installs : "—"}
                  </span>
                  <RatingDisplay
                    avgRating={skill.avgRating ?? null}
                    avgRatingHuman={skill.avgRatingHuman ?? null}
                    avgRatingBot={skill.avgRatingBot ?? null}
                    reviewCount={skill.reviewCount ?? 0}
                    humanReviewCount={skill.humanReviewCount}
                    botReviewCount={skill.botReviewCount}
                    userRating={userRating}
                    reviewerFilter={reviewerFilter}
                    size="sm"
                    dataTour={isFirstCard ? "rating" : undefined}
                  />
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => onInstall(skill)}
              >
                Install
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  trackExternalLink(`https://www.clawhub.ai/${skill.author}/${skill.slug}`, "skill_detail");
                  window.open(`https://www.clawhub.ai/${skill.author}/${skill.slug}`, "_blank", "noopener,noreferrer");
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default card variant
  return (
    <Card className="group overflow-hidden transition-all hover:shadow-md hover:border-primary/20 py-3 gap-0" {...(isFirstCard ? { "data-tour": "skill-card" } : {})}>
      <CardContent className="p-4">
        {/* Header: Name + Category */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <Link href={`/skills/${skill.slug}`}>
              <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors flex items-center gap-1">
                {skill.name || skill.slug}
                {skill.isVerified && (
                  <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />
                )}
                <SecurityBadge risk={skill.securityRisk} score={skill.securityScore} />
              </h3>
            </Link>
            <p className="text-xs text-muted-foreground truncate">
              /{skill.slug} · by {skill.author}
            </p>
          </div>
          {skill.category && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {skill.category}
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-[2.5rem]">
          {skill.description || "Agent-ready skill pack for Claude Code."}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className={`text-xs px-2 py-0.5 border-0 ${getTagColor(tag)}`}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats row - includes rating */}
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1" title="Stars">
              <Star className="h-3.5 w-3.5" />
              <span>{skill.stars}</span>
            </div>
            <div className="flex items-center gap-1" title="Downloads">
              <Download className="h-3.5 w-3.5" />
              <span>{skill.downloads}</span>
            </div>
            <div className="flex items-center gap-1" title="Installs">
              <Terminal className="h-3.5 w-3.5" />
              <span>{skill.installs > 0 ? skill.installs : "—"}</span>
            </div>
          </div>
          <RatingDisplay
            avgRating={skill.avgRating ?? null}
            avgRatingHuman={skill.avgRatingHuman ?? null}
            avgRatingBot={skill.avgRatingBot ?? null}
            reviewCount={skill.reviewCount ?? 0}
            humanReviewCount={skill.humanReviewCount}
            botReviewCount={skill.botReviewCount}
            userRating={userRating}
            reviewerFilter={reviewerFilter}
            size="sm"
            dataTour={isFirstCard ? "rating" : undefined}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onInstall(skill)}
          >
            Install
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              trackExternalLink(`https://www.clawhub.ai/${skill.author}/${skill.slug}`, "skill_detail");
              window.open(`https://www.clawhub.ai/${skill.author}/${skill.slug}`, "_blank", "noopener,noreferrer");
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
