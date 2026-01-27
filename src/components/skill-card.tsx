"use client";

import { Star, Download, Terminal, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
};

type SkillCardProps = {
  skill: Skill;
  onInstall: (skill: Skill) => void;
  variant?: "card" | "list";
};

export function SkillCard({ skill, onInstall, variant = "card" }: SkillCardProps) {
  const tags = skill.normalizedTags?.slice(0, 3) ?? [];

  if (variant === "list") {
    return (
      <Card className="group overflow-hidden transition-all hover:shadow-md hover:border-primary/20">
        <CardContent className="p-4 flex gap-4 items-start">
          {/* Left: Main content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start gap-2 mb-1">
              <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                {skill.name || skill.slug}
              </h3>
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
            <div className="flex items-center gap-3 flex-wrap">
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
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {skill.stars}
                </span>
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  {skill.downloads}
                </span>
                {skill.installs > 0 && (
                  <span className="flex items-center gap-1">
                    <Terminal className="h-3 w-3" />
                    {skill.installs}
                  </span>
                )}
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
            <Button size="sm" variant="outline" asChild>
              <a
                href={`https://clawdhub.com/skills/${skill.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default card variant
  return (
    <Card className="group overflow-hidden transition-all hover:shadow-md hover:border-primary/20">
      <CardContent className="p-4">
        {/* Header: Name + Category */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
              {skill.name || skill.slug}
            </h3>
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

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1" title="Stars">
            <Star className="h-3.5 w-3.5" />
            <span>{skill.stars}</span>
          </div>
          <div className="flex items-center gap-1" title="Downloads">
            <Download className="h-3.5 w-3.5" />
            <span>{skill.downloads}</span>
          </div>
          {skill.installs > 0 && (
            <div className="flex items-center gap-1" title="Installs">
              <Terminal className="h-3.5 w-3.5" />
              <span>{skill.installs}</span>
            </div>
          )}
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
          <Button size="sm" variant="outline" asChild>
            <a
              href={`https://clawdhub.com/skills/${skill.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
