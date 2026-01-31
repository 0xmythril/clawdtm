"use client";

import { Copy, Check, Terminal, ExternalLink, MessageSquare } from "lucide-react";
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
import { trackExternalLink } from "@/lib/analytics";

type InstallModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: Skill | null;
};

export function InstallModal({ open, onOpenChange, skill }: InstallModalProps) {
  const [copied, setCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  if (!skill) return null;

  const installCommand = `clawdhub install ${skill.slug}`;
  const installPrompt = `Install the ${skill.name || skill.slug} skill`;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto mx-4 sm:mx-auto w-[calc(100%-2rem)] sm:w-full">
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
          </div>

          {/* Bot Prompt Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">
                Or Ask Your Bot
              </p>
            </div>
            <div className="relative">
              <pre className="bg-muted/50 border border-border rounded-lg p-3 pr-12 text-xs sm:text-sm overflow-x-auto font-mono whitespace-pre-wrap break-all">
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
              Copy this prompt and send it directly to your bot via DM, chat, or your preferred interface. 
              Your bot will handle the installation automatically.
            </p>
          </div>

          {/* Skill locations info */}
          <div className="bg-muted/30 border border-border/50 rounded-lg p-3 text-xs sm:text-sm space-y-2">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Where skills are installed:</strong>
            </p>
            <ul className="text-muted-foreground text-xs space-y-1 ml-4 list-disc">
              <li><code className="text-foreground break-all">./skills</code> — current workspace (default)</li>
              <li><code className="text-foreground break-all">~/.openclaw/skills</code> — shared across all agents</li>
            </ul>
          </div>

          {/* Prerequisites note */}
          <div className="bg-muted/30 border border-border/50 rounded-lg p-3 text-xs sm:text-sm">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Prerequisites:</strong> Make sure you have{" "}
              <a
                href="https://docs.openclaw.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                OpenClaw
              </a>{" "}
              installed and configured.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full h-10 cursor-pointer"
              onClick={() => {
                trackExternalLink(`https://clawdhub.com/skills/${skill.slug}`, "install_modal");
                window.open(`https://clawdhub.com/skills/${skill.slug}`, "_blank", "noopener,noreferrer");
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Clawdhub
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
