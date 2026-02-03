"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAdminRole } from "@/components/admin/admin-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  ShieldQuestion,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  SlidersHorizontal,
  UserX,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type RiskLevel = "safe" | "low" | "medium" | "high" | "critical";

const RISK_CONFIG = {
  safe: { 
    icon: ShieldCheck, 
    color: "text-green-500",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    label: "Safe"
  },
  low: { 
    icon: ShieldCheck, 
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    label: "Low"
  },
  medium: { 
    icon: Shield, 
    color: "text-yellow-500",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    label: "Medium"
  },
  high: { 
    icon: ShieldAlert, 
    color: "text-orange-500",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    label: "High"
  },
  critical: { 
    icon: ShieldAlert, 
    color: "text-red-500",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    label: "Critical"
  },
};

// Score range presets matching risk levels
const SCORE_PRESETS = [
  { label: "Critical (0-24)", min: 0, max: 24, color: "text-red-500" },
  { label: "High (25-49)", min: 25, max: 49, color: "text-orange-500" },
  { label: "Medium (50-69)", min: 50, max: 69, color: "text-yellow-500" },
  { label: "Low (70-89)", min: 70, max: 89, color: "text-green-600" },
  { label: "Safe (90-100)", min: 90, max: 100, color: "text-green-500" },
];

type FilterMode = "risk" | "score";

export default function AdminSecurityPage() {
  const { clerkId } = useAdminRole();
  const [filterMode, setFilterMode] = useState<FilterMode>("risk");
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel | null>(null);
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 50]);
  const [scanningSkillId, setScanningSkillId] = useState<Id<"cachedSkills"> | null>(null);
  const [authorsOpen, setAuthorsOpen] = useState(false);
  const [blockingAuthor, setBlockingAuthor] = useState<string | null>(null);

  // Get security stats
  const stats = useQuery(api.security.getSecurityStats);
  
  // Get authors (only when section is open)
  const authors = useQuery(
    api.admin.getAuthorsWithCounts,
    authorsOpen && clerkId ? { clerkId, includeHidden: true } : "skip"
  );

  // Get skills by risk level (when in risk mode)
  const skillsByRisk = useQuery(
    api.security.getSkillsByRiskLevel,
    filterMode === "risk" && selectedRisk ? { riskLevel: selectedRisk, limit: 50 } : "skip"
  );

  // Get skills by score range (when in score mode)
  const skillsByScore = useQuery(
    api.security.getSkillsByScoreRange,
    filterMode === "score" ? { minScore: scoreRange[0], maxScore: scoreRange[1], limit: 50 } : "skip"
  );

  // Use the appropriate query result
  const skillsQuery = filterMode === "risk" ? skillsByRisk : skillsByScore;

  // Mutations
  const triggerScan = useMutation(api.security.triggerManualScan);
  const hideSkill = useMutation(api.admin.adminHideSkill);
  const hideByAuthor = useMutation(api.admin.adminHideSkillsByAuthor);

  const handleBlockAuthor = async (author: string) => {
    if (!clerkId) return;
    setBlockingAuthor(author);
    try {
      const result = await hideByAuthor({ 
        clerkId, 
        author, 
        reason: `All skills by ${author} blocked by admin` 
      });
      console.log(`Blocked ${result.hiddenCount} skills by ${author}`);
    } catch (error) {
      console.error("Block author failed:", error);
    } finally {
      setBlockingAuthor(null);
    }
  };

  const handleScan = async (skillId: Id<"cachedSkills">) => {
    if (!clerkId) return;
    setScanningSkillId(skillId);
    try {
      await triggerScan({ clerkId, skillId });
    } catch (error) {
      console.error("Scan failed:", error);
    } finally {
      setScanningSkillId(null);
    }
  };

  const handleHide = async (slug: string, reason: string) => {
    if (!clerkId) return;
    try {
      await hideSkill({ clerkId, slug, reason });
    } catch (error) {
      console.error("Hide failed:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Security Dashboard</h2>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card className="col-span-2">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{stats?.total ?? "—"}</p>
              <p className="text-sm text-muted-foreground">Total Skills</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:ring-2 hover:ring-primary/50",
            selectedRisk === null && "ring-2 ring-primary"
          )}
          onClick={() => setSelectedRisk(null)}
        >
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-muted-foreground">{stats?.unscanned ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Unscanned</p>
            </div>
          </CardContent>
        </Card>

        {(["safe", "low", "medium", "high", "critical"] as RiskLevel[]).map((level) => {
          const config = RISK_CONFIG[level];
          const Icon = config.icon;
          const count = stats?.[level] ?? 0;

          return (
            <Card 
              key={level}
              className={cn(
                "cursor-pointer transition-all hover:ring-2 hover:ring-primary/50",
                filterMode === "risk" && selectedRisk === level && "ring-2 ring-primary"
              )}
              onClick={() => {
                setFilterMode("risk");
                setSelectedRisk(level);
              }}
            >
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className={cn("flex items-center justify-center gap-1", config.color)}>
                    <Icon className="h-4 w-4" />
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Score Range Slider Filter */}
      <Card className={cn(
        "transition-all",
        filterMode === "score" && "ring-2 ring-primary"
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filter by Score Range
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Slider
                value={scoreRange}
                onValueChange={(value) => {
                  setScoreRange(value as [number, number]);
                  setFilterMode("score");
                }}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>0 (Critical)</span>
                <span>25</span>
                <span>50</span>
                <span>70</span>
                <span>100 (Safe)</span>
              </div>
            </div>
            <div className="text-center min-w-[100px]">
              <p className="text-lg font-semibold">
                {scoreRange[0]} - {scoreRange[1]}
              </p>
              <p className="text-xs text-muted-foreground">Score Range</p>
            </div>
          </div>
          
          {/* Quick presets */}
          <div className="flex flex-wrap gap-2">
            {SCORE_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                className={cn(
                  "text-xs",
                  filterMode === "score" && 
                  scoreRange[0] === preset.min && 
                  scoreRange[1] === preset.max && 
                  "ring-2 ring-primary"
                )}
                onClick={() => {
                  setScoreRange([preset.min, preset.max]);
                  setFilterMode("score");
                }}
              >
                <span className={preset.color}>●</span>
                <span className="ml-1">{preset.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Skills List */}
      {((filterMode === "risk" && selectedRisk) || filterMode === "score") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {filterMode === "risk" && selectedRisk ? (
                (() => {
                  const config = RISK_CONFIG[selectedRisk];
                  const Icon = config.icon;
                  return (
                    <>
                      <Icon className={cn("h-5 w-5", config.color)} />
                      {config.label} Risk Skills
                    </>
                  );
                })()
              ) : (
                <>
                  <SlidersHorizontal className="h-5 w-5" />
                  Skills with Score {scoreRange[0]}-{scoreRange[1]}
                </>
              )}
              <Badge variant="secondary">{skillsQuery?.total ?? 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!skillsQuery ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : skillsQuery.skills.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {filterMode === "risk" 
                  ? `No skills with ${selectedRisk} risk level`
                  : `No skills with score between ${scoreRange[0]} and ${scoreRange[1]}`
                }
              </p>
            ) : (
              <div className="space-y-2">
                {skillsQuery.skills.map((skill) => (
                  <div
                    key={skill._id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{skill.name}</span>
                        <span className="text-xs text-muted-foreground">/{skill.slug}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">by {skill.author}</span>
                        {skill.securityScore !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            Score: {skill.securityScore}/100
                          </Badge>
                        )}
                        {skill.securityFlags && skill.securityFlags.length > 0 && (
                          <div className="flex gap-1">
                            {skill.securityFlags.slice(0, 3).map((flag) => (
                              <Badge
                                key={flag}
                                variant="secondary"
                                className="text-xs flex items-center gap-1"
                              >
                                <AlertTriangle className="h-2.5 w-2.5" />
                                {flag.replace(/_/g, " ")}
                              </Badge>
                            ))}
                            {skill.securityFlags.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{skill.securityFlags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleScan(skill._id)}
                        disabled={scanningSkillId === skill._id}
                      >
                        {scanningSkillId === skill._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        <span className="sr-only">Rescan</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a
                          href={`/skills/${skill.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>

                      {((filterMode === "risk" && (selectedRisk === "high" || selectedRisk === "critical")) ||
                        (filterMode === "score" && (skill.securityScore ?? 100) < 50)) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleHide(skill.slug, `Hidden due to security score ${skill.securityScore}/100`)}
                        >
                          <EyeOff className="h-4 w-4" />
                          <span className="ml-1">Hide</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Block by Author Section */}
      <Collapsible open={authorsOpen} onOpenChange={setAuthorsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <UserX className="h-5 w-5" />
                  Block by Author
                </span>
                {authorsOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Block all skills from a specific author. This is useful for dealing with malicious users.
              </p>
              
              {authors === undefined ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {authors.map((author) => (
                    <div
                      key={author.author}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{author.author}</span>
                        <Badge variant="secondary">
                          {author.total} skill{author.total !== 1 ? "s" : ""}
                        </Badge>
                        {author.hidden > 0 && (
                          <Badge variant="destructive">
                            {author.hidden} hidden
                          </Badge>
                        )}
                      </div>
                      
                      {author.hidden < author.total && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleBlockAuthor(author.author)}
                          disabled={blockingAuthor === author.author}
                        >
                          {blockingAuthor === author.author ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserX className="h-4 w-4" />
                          )}
                          <span className="ml-1">Block All</span>
                        </Button>
                      )}
                      
                      {author.hidden === author.total && author.total > 0 && (
                        <Badge variant="outline" className="text-muted-foreground">
                          All blocked
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Info Panel */}
      {filterMode === "risk" && !selectedRisk && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldQuestion className="h-5 w-5" />
              About Security Scanning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Skills are automatically scanned for security issues using AI analysis.
              The scanner checks for:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Remote code execution (downloading and running external binaries)</li>
              <li>Obfuscated code (Base64, encoded scripts)</li>
              <li>Sensitive data access (passwords, wallets, credentials)</li>
              <li>Dangerous shell commands (curl|bash, eval)</li>
              <li>Suspicious network requests</li>
              <li>Permission escalation attempts</li>
            </ul>
            <p>
              Click on a risk level above to view skills in that category.
              High and critical risk skills can be hidden from public view.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
