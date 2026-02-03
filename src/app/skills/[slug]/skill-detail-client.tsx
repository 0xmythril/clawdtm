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
  ShieldCheck,
  ShieldAlert,
  Shield,
  ShieldQuestion,
  AlertTriangle,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { QuickRating } from "@/components/quick-rating";
import { ReviewForm } from "@/components/review-form";
import { ReviewList } from "@/components/review-list";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

type SecurityRisk = "safe" | "low" | "medium" | "high" | "critical";

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
  reviewCount: number;
  humanReviewCount: number;
  botReviewCount: number;
  avgRating: number | null;
  avgRatingHuman: number | null;
  avgRatingBot: number | null;
  createdAt?: number;
  updatedAt?: number;
  // Security
  securityScore?: number;
  securityRisk?: SecurityRisk;
  securityFlags?: string[];
  lastSecurityScanAt?: number;
  vtAnalysisUrl?: string;
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

  // User's existing review
  const userReview = useQuery(
    api.reviews.getUserReview,
    user?.id ? { cachedSkillId: skill._id, clerkId: user.id } : "skip"
  );

  // Install command
  const installCommand = `clawhub install ${skill.slug}`;

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
                  href={`https://www.clawhub.ai/${skill.authorHandle}`}
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
          
          {/* Quick rating */}
          <QuickRating
            skillId={skill._id}
            avgRating={skill.avgRating}
            reviewCount={skill.reviewCount}
            humanReviewCount={skill.humanReviewCount}
            botReviewCount={skill.botReviewCount}
            userRating={userReview?.rating ?? null}
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
                <span className="text-base">🦞</span>
                {skill.avgRating !== null ? (
                  <span className="text-orange-600 dark:text-orange-400">{skill.avgRating.toFixed(1)}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <SecuritySection skill={skill} />

      {/* Install Command */}
      <Card className="gap-3 py-4">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Install
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
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
          <p className="text-xs text-muted-foreground">
            Requires the ClawHub CLI. Installation is covered in the{" "}
            <a
              href="https://docs.openclaw.ai/tools/clawhub"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              ClawHub docs
            </a>
            .
          </p>
          <Button variant="outline" className="w-full" asChild>
            <a
              href={`https://www.clawhub.ai/${skill.authorHandle}/${skill.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Clawhub
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
                  <span>🦞</span>
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

// Security section component
function SecuritySection({ skill }: { skill: SkillData }) {
  const { securityScore, securityRisk, securityFlags, lastSecurityScanAt, vtAnalysisUrl } = skill;
  
  // Security risk config
  const riskConfig = {
    safe: { 
      icon: ShieldCheck, 
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      borderColor: "border-green-200 dark:border-green-800",
      label: "Safe",
      description: "No security concerns detected"
    },
    low: { 
      icon: ShieldCheck, 
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      borderColor: "border-green-200 dark:border-green-800",
      label: "Low Risk",
      description: "Minor concerns, likely safe to use"
    },
    medium: { 
      icon: Shield, 
      color: "text-yellow-500",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
      borderColor: "border-yellow-200 dark:border-yellow-800",
      label: "Medium Risk",
      description: "Some suspicious patterns detected - review before use"
    },
    high: { 
      icon: ShieldAlert, 
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      borderColor: "border-orange-200 dark:border-orange-800",
      label: "High Risk",
      description: "Multiple red flags - use with extreme caution"
    },
    critical: { 
      icon: ShieldAlert, 
      color: "text-red-500",
      bgColor: "bg-red-50 dark:bg-red-950/30",
      borderColor: "border-red-200 dark:border-red-800",
      label: "Critical Risk",
      description: "Likely malicious - do not use"
    },
  };

  // Flag descriptions
  const flagDescriptions: Record<string, string> = {
    remote_execution: "Downloads and executes external code",
    obfuscated_code: "Contains obfuscated or encoded scripts",
    sensitive_data_access: "Accesses passwords, credentials, or wallets",
    shell_commands: "Executes shell commands",
    network_requests: "Makes requests to external servers",
    permission_escalation: "Requests elevated permissions",
    data_exfiltration: "May send data to external servers",
    persistence: "Sets up persistent processes",
    external_url: "Contains external download URLs",
    vt_threats_detected: "VirusTotal detected threats in linked files",
    parse_error: "Analysis could not complete - review manually",
    scan_error: "Scan failed - manual review recommended",
  };

  // Not scanned yet
  if (!securityRisk) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <ShieldQuestion className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Security Scan Pending</p>
              <p className="text-xs text-muted-foreground">
                This skill will be automatically scanned for security issues
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = riskConfig[securityRisk];
  const Icon = config.icon;
  const flags = securityFlags ?? [];

  return (
    <Card className={`${config.bgColor} ${config.borderColor}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Icon className={`h-5 w-5 ${config.color}`} />
          Security Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Risk level and score */}
        <div className="flex items-center justify-between">
          <div>
            <span className={`font-semibold ${config.color}`}>
              {config.label}
            </span>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
          {securityScore !== undefined && (
            <div className="text-right">
              <span className={`text-2xl font-bold ${config.color}`}>
                {securityScore}
              </span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
          )}
        </div>

        {/* Score bar */}
        {securityScore !== undefined && (
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                securityScore >= 70 ? "bg-green-500" :
                securityScore >= 50 ? "bg-yellow-500" :
                securityScore >= 25 ? "bg-orange-500" : "bg-red-500"
              }`}
              style={{ width: `${securityScore}%` }}
            />
          </div>
        )}

        {/* Flags */}
        {flags.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Detected Issues:</p>
            <div className="flex flex-wrap gap-2">
              {flags.map((flag) => (
                <Badge
                  key={flag}
                  variant="outline"
                  className="text-xs flex items-center gap-1"
                  title={flagDescriptions[flag] ?? flag}
                >
                  <AlertTriangle className="h-3 w-3" />
                  {flag.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
          <span>
            {lastSecurityScanAt 
              ? `Scanned ${new Date(lastSecurityScanAt).toLocaleDateString()}`
              : "Recently scanned"
            }
          </span>
          {vtAnalysisUrl && (
            <a
              href={vtAnalysisUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              View VirusTotal Report
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
