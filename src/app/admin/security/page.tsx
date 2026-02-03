"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAdminRole } from "@/components/admin/admin-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../convex/_generated/dataModel";

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

export default function AdminSecurityPage() {
  const { clerkId } = useAdminRole();
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel | null>(null);
  const [scanningSkillId, setScanningSkillId] = useState<Id<"cachedSkills"> | null>(null);

  // Get security stats
  const stats = useQuery(api.security.getSecurityStats);

  // Get skills by risk level
  const skillsQuery = useQuery(
    api.security.getSkillsByRiskLevel,
    selectedRisk ? { riskLevel: selectedRisk, limit: 50 } : "skip"
  );

  // Mutations
  const triggerScan = useMutation(api.security.triggerManualScan);
  const hideSkill = useMutation(api.admin.adminHideSkill);

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
                selectedRisk === level && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedRisk(level)}
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

      {/* Risk Level Details */}
      {selectedRisk && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const config = RISK_CONFIG[selectedRisk];
                const Icon = config.icon;
                return (
                  <>
                    <Icon className={cn("h-5 w-5", config.color)} />
                    {config.label} Risk Skills
                    <Badge variant="secondary">{skillsQuery?.total ?? 0}</Badge>
                  </>
                );
              })()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!skillsQuery ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : skillsQuery.skills.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No skills with {selectedRisk} risk level
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

                      {(selectedRisk === "high" || selectedRisk === "critical") && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleHide(skill.slug, `Hidden due to ${selectedRisk} security risk`)}
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

      {/* Info Panel */}
      {!selectedRisk && (
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
