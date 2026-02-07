"use client";

import { Copy, Check, Terminal, ExternalLink, MessageSquare, ShieldCheck, ShieldAlert, ShieldQuestion, Shield } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Skill, SecurityRisk } from "./skill-card";
import { trackExternalLink } from "@/lib/analytics";

type InstallModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: Skill | null;
};

function getSecurityBadge(risk?: SecurityRisk, score?: number) {
  if (!risk || score === undefined || score === null) {
    return {
      icon: ShieldQuestion,
      label: "Not scanned",
      color: "text-muted-foreground",
      bg: "bg-muted/50 border-border",
      description: "This skill has not been security scanned yet.",
    };
  }

  switch (risk) {
    case "safe":
      return {
        icon: ShieldCheck,
        label: "Safe",
        color: "text-green-600 dark:text-green-400",
        bg: "bg-green-500/10 border-green-500/20",
        description: "Scanned and no security concerns found.",
      };
    case "low":
      return {
        icon: Shield,
        label: "Low risk",
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-500/10 border-blue-500/20",
        description: "Minor flags detected, generally safe to use.",
      };
    case "medium":
      return {
        icon: ShieldAlert,
        label: "Medium risk",
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/10 border-amber-500/20",
        description: "Some security concerns — review before installing.",
      };
    case "high":
      return {
        icon: ShieldAlert,
        label: "High risk",
        color: "text-orange-600 dark:text-orange-400",
        bg: "bg-orange-500/10 border-orange-500/20",
        description: "Significant security concerns detected.",
      };
    case "critical":
      return {
        icon: ShieldAlert,
        label: "Critical risk",
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-500/10 border-red-500/20",
        description: "Critical security issues — not recommended.",
      };
    default:
      return {
        icon: ShieldQuestion,
        label: "Unknown",
        color: "text-muted-foreground",
        bg: "bg-muted/50 border-border",
        description: "Security status unknown.",
      };
  }
}

const FLAG_LABELS: Record<string, string> = {
  remote_execution: "Remote execution",
  obfuscated_code: "Obfuscated code",
  sensitive_data_access: "Sensitive data access",
  shell_commands: "Shell commands",
  network_requests: "Network requests",
  permission_escalation: "Permission escalation",
  data_exfiltration: "Data exfiltration",
  persistence: "Persistent processes",
};

export function InstallModal({ open, onOpenChange, skill }: InstallModalProps) {
  const [copied, setCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  if (!skill) return null;

  const installCommand = `clawhub install ${skill.slug}`;
  const installPrompt = `Install the ${skill.name || skill.slug} skill. Check its security scan results first.`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handlePromptCopy = async () => {
    try {
      await navigator.clipboard.writeText(installPrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const badge = getSecurityBadge(skill.securityRisk, skill.securityScore);
  const BadgeIcon = badge.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto mx-4 sm:mx-auto w-[calc(100%-2rem)] sm:w-full">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="text-xl">🦞</span>
            <span className="truncate">Install {skill.name || skill.slug}</span>
          </DialogTitle>
          <DialogDescription>
            Ask your agent to install this skill, or run the command in your terminal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Security Badge */}
          <div className={`flex items-start gap-3 rounded-lg border p-3 ${badge.bg}`}>
            <BadgeIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${badge.color}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${badge.color}`}>
                  {badge.label}
                </span>
                {skill.securityScore !== undefined && skill.securityScore !== null && (
                  <span className="text-xs text-muted-foreground">
                    Score: {skill.securityScore}/100
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {badge.description}
              </p>
              {skill.securityFlags && skill.securityFlags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {skill.securityFlags.map((flag) => (
                    <span
                      key={flag}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-background/50 text-muted-foreground border border-border/50"
                    >
                      {FLAG_LABELS[flag] || flag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Primary: Ask Your Agent */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">
                Ask Your Agent
              </p>
              <span className="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                Recommended
              </span>
            </div>
            <div className="relative">
              <pre className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 pr-12 text-xs sm:text-sm overflow-x-auto font-mono whitespace-pre-wrap break-all">
                <code className="text-foreground">{installPrompt}</code>
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 cursor-pointer"
                onClick={handlePromptCopy}
              >
                {promptCopied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Copy this and send it to your bot. If your agent has the{" "}
              <a
                href="/api/advisor/skill.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                ClawdTM Advisor skill
              </a>
              , it will check security automatically. Otherwise it will use{" "}
              <code className="text-foreground">clawhub install</code>.
            </p>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or use the terminal
              </span>
            </div>
          </div>

          {/* Secondary: Terminal Command */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Terminal Command
              </p>
            </div>
            <div className="relative">
              <pre className="bg-muted/50 border border-border rounded-lg p-3 pr-12 text-xs sm:text-sm overflow-x-auto font-mono whitespace-pre-wrap break-all">
                <code className="text-foreground">{installCommand}</code>
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 cursor-pointer"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Requires the{" "}
              <a
                href="https://docs.openclaw.ai/tools/clawhub"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                ClawHub CLI
              </a>
              . Skills install to <code className="text-foreground">./skills</code> by default.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full h-10 cursor-pointer"
              onClick={() => {
                trackExternalLink(`https://www.clawhub.ai/${skill.author}/${skill.slug}`, "install_modal");
                window.open(`https://www.clawhub.ai/${skill.author}/${skill.slug}`, "_blank", "noopener,noreferrer");
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Clawhub
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
