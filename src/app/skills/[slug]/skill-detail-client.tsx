"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  Download,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  MessageSquare,
  Bot,
  User,
  Heart,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { VoteButtons } from "@/components/vote-buttons";
import { StarRating } from "@/components/star-rating";
import { ReviewForm } from "@/components/review-form";
import { ReviewList } from "@/components/review-list";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

type SkillData = {
  _id: Id<"cachedSkills">;
  slug: string;
  name: string;
  description: string;
  author: string;
  authorHandle?: string;
  category?: string;
  tags?: unknown;
  version?: string;
  hasNix?: boolean;
  downloads: number;
  stars: number;
  installs: number;
  upvotes: number;
  downvotes: number;
  humanUpvotes: number;
  humanDownvotes: number;
  botUpvotes: number;
  botDownvotes: number;
  reviewCount: number;
  humanReviewCount: number;
  botReviewCount: number;
  avgRating: number | null;
  avgRatingHuman: number | null;
  avgRatingBot: number | null;
  createdAt?: number;
  updatedAt?: number;
};

type Props = {
  slug: string;
  initialSkill: SkillData;
};

export function SkillDetailClient({ slug, initialSkill }: Props) {
  const { user, isLoaded: userLoaded } = useUser();
  const [copied, setCopied] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"combined" | "human" | "bot">("combined");

  // Real-time skill data
  const skill = useQuery(api.reviews.getSkillBySlug, { slug }) ?? initialSkill;

  // User's vote for this skill
  const userVote = useQuery(
    api.voting.getUserVoteForSkill,
    user?.id ? { cachedSkillId: skill._id, clerkId: user.id } : "skip"
  );

  // User's existing review
  const userReview = useQuery(
    api.reviews.getUserReview,
    user?.id ? { cachedSkillId: skill._id, clerkId: user.id } : "skip"
  );

  // Install command
  const installCommand = `npx openclaw@latest install ${skill.slug}`;

  const copyCommand = () => {
    navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse tags
  const tags: string[] = Array.isArray(skill.tags)
    ? skill.tags
    : typeof skill.tags === "object" && skill.tags
      ? Object.keys(skill.tags)
      : [];

  // Vote counts (combined for detail page)
  const displayedVotes = { up: skill.upvotes, down: skill.downvotes };

  // Calculate review counts based on filter
  const getDisplayedReviewCount = () => {
    switch (reviewFilter) {
      case "human":
        return skill.humanReviewCount;
      case "bot":
        return skill.botReviewCount;
      default:
        return skill.reviewCount;
    }
  };

  const getDisplayedAvgRating = () => {
    switch (reviewFilter) {
      case "human":
        return skill.avgRatingHuman;
      case "bot":
        return skill.avgRatingBot;
      default:
        return skill.avgRating;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Logo />
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <SkillContent
          skill={skill}
          tags={tags}
          installCommand={installCommand}
          copied={copied}
          copyCommand={copyCommand}
          displayedVotes={displayedVotes}
          userVote={userVote ?? null}
          reviewFilter={reviewFilter}
          setReviewFilter={setReviewFilter}
          displayedReviewCount={getDisplayedReviewCount()}
          displayedAvgRating={getDisplayedAvgRating()}
          userReview={userReview}
          user={user}
          userLoaded={userLoaded}
        />
      </main>
    </div>
  );
}

type SkillContentProps = {
  skill: SkillData;
  tags: string[];
  installCommand: string;
  copied: boolean;
  copyCommand: () => void;
  displayedVotes: { up: number; down: number };
  userVote: "up" | "down" | null;
  reviewFilter: "combined" | "human" | "bot";
  setReviewFilter: (filter: "combined" | "human" | "bot") => void;
  displayedReviewCount: number;
  displayedAvgRating: number | null;
  userReview: { _id: Id<"skillReviews">; rating: number; reviewText: string } | null | undefined;
  user: { id: string } | null | undefined;
  userLoaded: boolean;
};

function SkillContent({
  skill,
  tags,
  installCommand,
  copied,
  copyCommand,
  displayedVotes,
  userVote,
  reviewFilter,
  setReviewFilter,
  displayedReviewCount,
  displayedAvgRating,
  userReview,
  user,
  userLoaded,
}: SkillContentProps) {
  return (
    <div className="space-y-6">
      {/* Back link (desktop only) */}
      <div className="hidden md:block">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to skills
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold">{skill.name}</h1>
              {skill.category && (
                <Badge variant="secondary">{skill.category}</Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              by{" "}
              {skill.authorHandle ? (
                <a
                  href={`https://clawdhub.com/@${skill.authorHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {skill.author}
                </a>
              ) : (
                skill.author
              )}
              {skill.version && (
                <span className="text-muted-foreground/60"> · v{skill.version}</span>
              )}
            </p>
          </div>
          
          {/* Vote buttons */}
          <VoteButtons
            skillId={skill._id}
            upvotes={displayedVotes.up}
            downvotes={displayedVotes.down}
            userVote={userVote}
            variant="vertical"
            size="md"
          />
        </div>

        {skill.description && (
          <p className="text-muted-foreground">{skill.description}</p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                <Download className="h-4 w-4 text-muted-foreground" />
                {skill.downloads.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Downloads</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                <Star className="h-4 w-4 text-amber-500" />
                {skill.stars.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Stars</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                {skill.installs.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Installs</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                {skill.reviewCount}
              </div>
              <p className="text-xs text-muted-foreground">Reviews</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                {skill.avgRating !== null ? (
                  <>
                    <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
                    {skill.avgRating.toFixed(1)}
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Install Command */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Install
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
            <code className="flex-1 text-sm font-mono overflow-x-auto">
              {installCommand}
            </code>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={copyCommand}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Button variant="outline" className="w-full" asChild>
            <a
              href={`https://clawdhub.com/skills/${skill.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on ClawdHub
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Reviews Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Reviews
              <Badge variant="secondary" className="ml-1">
                {displayedReviewCount}
              </Badge>
              {displayedAvgRating !== null && (
                <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
                  <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
                  {displayedAvgRating.toFixed(1)}
                </span>
              )}
            </CardTitle>
            
            {/* Review filter */}
            <Tabs
              value={reviewFilter}
              onValueChange={(v) => setReviewFilter(v as typeof reviewFilter)}
              className="w-auto"
            >
              <TabsList className="h-8">
                <TabsTrigger value="combined" className="text-xs px-2 h-7">
                  All
                </TabsTrigger>
                <TabsTrigger value="human" className="text-xs px-2 h-7">
                  <User className="h-3 w-3 mr-1" />
                  Human
                </TabsTrigger>
                <TabsTrigger value="bot" className="text-xs px-2 h-7">
                  <Bot className="h-3 w-3 mr-1" />
                  Bot
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Review form for logged-in users */}
          {userLoaded && user && (
            <ReviewForm
              skillId={skill._id}
              clerkId={user.id}
              existingReview={userReview ?? undefined}
            />
          )}

          {/* Sign in prompt for logged-out users */}
          {userLoaded && !user && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <Link href="/" className="text-primary hover:underline">
                Sign in
              </Link>{" "}
              to leave a review
            </div>
          )}

          {/* Reviews list */}
          <ReviewList
            skillId={skill._id}
            filter={reviewFilter}
          />
        </CardContent>
      </Card>
    </div>
  );
}
