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
  // Hidden status (admin only)
  hidden?: boolean;
  hiddenReason?: string;
  hiddenAt?: number;
};

type Props = {
  slug: string;
  initialSkill: SkillData;
  isAdminView?: boolean;
};

export function SkillDetailClient({ slug, initialSkill, isAdminView }: Props) {
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

      {/* Admin: Hidden skill warning banner */}
      {isAdminView && initialSkill.hidden && (
        <div className="bg-red-500/10 border-b border-red-500/30">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-600 dark:text-red-400">
                  This skill is hidden from public view
                </p>
                <p className="text-red-600/80 dark:text-red-400/80 mt-1">
                  {initialSkill.hiddenReason || "No reason provided"}
                </p>
                {initialSkill.hiddenAt && (
                  <p className="text-red-600/60 dark:text-red-400/60 text-xs mt-1">
                    Hidden on {new Date(initialSkill.hiddenAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
      <Card className="bg-gray-50 dark:bg-card">
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
      <Card className="gap-3 py-4 bg-gray-50 dark:bg-card">
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
      <Card className="bg-gray-50 dark:bg-card">
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
                <TabsTrigger value="combined" className="text-xs px-2 h-7 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-input/30">
                  All
                </TabsTrigger>
                <TabsTrigger value="human" className="text-xs px-2 h-7 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-input/30">
                  <User className="h-3 w-3 mr-1" />
                  Human
                </TabsTrigger>
                <TabsTrigger value="bot" className="text-xs px-2 h-7 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-input/30">
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

// Types for structured security checks
type CheckStatus = "pass" | "fail" | "warn" | "unknown";

interface SecurityCheck {
  status: CheckStatus;
  details: string;
}

interface SecurityChecks {
  remote_execution?: SecurityCheck;
  obfuscated_code?: SecurityCheck;
  sensitive_data_access?: SecurityCheck;
  shell_commands?: SecurityCheck;
  network_requests?: SecurityCheck;
  permission_escalation?: SecurityCheck;
  data_exfiltration?: SecurityCheck;
  persistence?: SecurityCheck;
}

interface DataSources {
  skillContent?: boolean;
  userComments?: boolean;
  virusTotal?: boolean;
}

// Check labels for display
const CHECK_LABELS: Record<keyof SecurityChecks, string> = {
  remote_execution: "Remote Execution",
  obfuscated_code: "Obfuscated Code",
  sensitive_data_access: "Sensitive Data",
  shell_commands: "Shell Commands",
  network_requests: "Network Requests",
  permission_escalation: "Permission Escalation",
  data_exfiltration: "Data Exfiltration",
  persistence: "Persistence",
};

// Status badge config
const STATUS_CONFIG: Record<CheckStatus, { label: string; color: string; bgColor: string }> = {
  pass: { label: "PASS", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/40" },
  fail: { label: "FAIL", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/40" },
  warn: { label: "WARN", color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/40" },
  unknown: { label: "???", color: "text-gray-500", bgColor: "bg-gray-100 dark:bg-gray-800" },
};

// Security section component
function SecuritySection({ skill }: { skill: SkillData }) {
  const { securityScore, securityRisk, lastSecurityScanAt, vtAnalysisUrl } = skill;
  
  // Fetch scan history to get the structured checks
  const scanHistory = useQuery(
    api.security.getSkillScanHistory,
    { slug: skill.slug, limit: 1 }
  );
  const latestScan = scanHistory?.[0];
  const securityChecks = latestScan?.securityChecks as SecurityChecks | undefined;
  const dataSources = latestScan?.dataSources as DataSources | undefined;
  
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

  // Not scanned yet
  if (!securityRisk) {
    return (
      <Card className="border-dashed bg-gray-50 dark:bg-card">
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
  
  // Check if this is an unverified scan (content couldn't be fetched)
  const isUnverified = latestScan?.flags?.includes('content_unavailable') || 
                       latestScan?.flags?.includes('unverified') ||
                       (dataSources && !dataSources.skillContent);
  
  // Show special unverified state
  if (isUnverified && securityRisk === 'medium') {
    return (
      <Card className="border-dashed border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldQuestion className="h-5 w-5 text-yellow-500" />
            Security Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-yellow-600">Unverified</span>
              <p className="text-xs text-muted-foreground">
                Could not fetch skill content for analysis
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-yellow-500">?</span>
            </div>
          </div>
          
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              The actual skill.md content could not be retrieved from Clawhub. 
              This skill&apos;s security status cannot be verified. 
              <strong className="text-foreground"> Review the skill manually before use.</strong>
            </p>
          </div>

          {/* Data Sources */}
          <div className="space-y-1">
            <p className="text-sm font-medium mb-2">Data Sources Checked</p>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-sm">Skill Content (skill.md)</span>
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-100 dark:bg-red-900/40 text-red-600">
                  UNAVAILABLE
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-sm">User Comments</span>
                <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                  dataSources?.userComments 
                    ? "bg-green-100 dark:bg-green-900/40 text-green-600" 
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                }`}>
                  {dataSources?.userComments ? "YES" : "NO"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm">VirusTotal Scan</span>
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                  -
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
            <span>
              {lastSecurityScanAt 
                ? `Checked ${new Date(lastSecurityScanAt).toLocaleDateString()}`
                : "Recently checked"
              }
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = riskConfig[securityRisk];
  const Icon = config.icon;

  // Render a single check row
  const renderCheckRow = (key: keyof SecurityChecks, check?: SecurityCheck) => {
    const status = check?.status ?? "unknown";
    const statusConfig = STATUS_CONFIG[status];
    const details = check?.details ?? "Not analyzed";
    
    return (
      <div key={key} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">{CHECK_LABELS[key]}</span>
          <p className="text-xs text-muted-foreground truncate" title={details}>
            {details}
          </p>
        </div>
        <span className={`ml-2 px-2 py-0.5 text-xs font-bold rounded ${statusConfig.bgColor} ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </div>
    );
  };

  return (
    <Card className={`${config.bgColor} ${config.borderColor}`}>
      <CardHeader className="pb-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <Icon className={`h-5 w-5 ${config.color}`} />
          Security Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 space-y-4">
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

        {/* AI Summary */}
        {latestScan?.summary && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">{latestScan.summary}</p>
          </div>
        )}

        {/* Security Checks Checklist */}
        <div className="space-y-1">
          <p className="text-sm font-medium mb-2">Security Checks</p>
          <div className="bg-muted/30 rounded-lg p-3">
            {renderCheckRow("remote_execution", securityChecks?.remote_execution)}
            {renderCheckRow("obfuscated_code", securityChecks?.obfuscated_code)}
            {renderCheckRow("sensitive_data_access", securityChecks?.sensitive_data_access)}
            {renderCheckRow("shell_commands", securityChecks?.shell_commands)}
            {renderCheckRow("network_requests", securityChecks?.network_requests)}
            {renderCheckRow("permission_escalation", securityChecks?.permission_escalation)}
            {renderCheckRow("data_exfiltration", securityChecks?.data_exfiltration)}
            {renderCheckRow("persistence", securityChecks?.persistence)}
          </div>
        </div>

        {/* Data Sources */}
        <div className="space-y-1">
          <p className="text-sm font-medium mb-2">Data Sources Checked</p>
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center justify-between py-1 border-b border-border/30">
              <span className="text-sm">Skill Content (skill.md)</span>
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                dataSources?.skillContent 
                  ? "bg-green-100 dark:bg-green-900/40 text-green-600" 
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500"
              }`}>
                {dataSources?.skillContent ? "YES" : "NO"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/30">
              <span className="text-sm">User Comments</span>
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                dataSources?.userComments 
                  ? "bg-green-100 dark:bg-green-900/40 text-green-600" 
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500"
              }`}>
                {dataSources?.userComments ? "YES" : "NO"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm">VirusTotal Scan</span>
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                dataSources?.virusTotal 
                  ? "bg-green-100 dark:bg-green-900/40 text-green-600" 
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500"
              }`}>
                {dataSources?.virusTotal ? "YES" : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
          <span>
            {lastSecurityScanAt 
              ? `Scanned ${new Date(lastSecurityScanAt).toLocaleDateString()}`
              : "Recently scanned"
            }
            {latestScan?.model && latestScan.model !== 'content-unavailable' && (
              <span className="opacity-60"> · AI analysis</span>
            )}
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
