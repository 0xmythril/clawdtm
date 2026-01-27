"use client";

import { Copy, Check, Terminal, ExternalLink } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Skill } from "./skill-card";

type InstallModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: Skill | null;
};

export function InstallModal({ open, onOpenChange, skill }: InstallModalProps) {
  const [copied, setCopied] = useState(false);

  if (!skill) return null;

  const installCommand = `clawdhub install ${skill.slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Terminal className="h-5 w-5 text-primary" />
            <span className="truncate">Install {skill.name || skill.slug}</span>
          </DialogTitle>
          <DialogDescription>
            Run this command in your terminal to install the skill.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Install Command */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Install Command
            </p>
            <div className="relative">
              <pre className="bg-muted/50 border border-border rounded-lg p-3 text-sm overflow-x-auto font-mono">
                <code className="text-foreground">{installCommand}</code>
              </pre>
            </div>
          </div>

          {/* Skill locations info */}
          <div className="bg-muted/30 border border-border/50 rounded-lg p-3 text-sm space-y-2">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Where skills are installed:</strong>
            </p>
            <ul className="text-muted-foreground text-xs space-y-1 ml-4 list-disc">
              <li><code className="text-foreground">./skills</code> — current workspace (default)</li>
              <li><code className="text-foreground">~/.clawdbot/skills</code> — shared across all agents</li>
            </ul>
          </div>

          {/* Prerequisites note */}
          <div className="bg-muted/30 border border-border/50 rounded-lg p-3 text-sm">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Prerequisites:</strong> Make sure you have{" "}
              <a
                href="https://docs.molt.bot/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Moltbot
              </a>{" "}
              installed and configured.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button 
              className="flex-1 h-10" 
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Command
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              className="h-10"
              asChild
            >
              <a
                href={`https://molthub.com/skills/${skill.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on Molthub
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
