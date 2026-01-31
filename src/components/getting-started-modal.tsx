"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, ExternalLink, Terminal, Copy, Check, Bot, MessageSquare } from "lucide-react";

type GettingStartedModalProps = {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function GettingStartedModal({ trigger, open, onOpenChange }: GettingStartedModalProps) {
  const [copied, setCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const exampleCommand = "clawdhub install web-search";
  const examplePrompt = "Install the web-search skill";

  const copyCommand = () => {
    navigator.clipboard.writeText(exampleCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(examplePrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="text-xl">🦞</span>
            Getting Started with ClawdTM
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* What is this */}
          <section>
            <h3 className="font-semibold text-foreground mb-2">What is ClawdTM?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ClawdTM is a skill directory for{" "}
              <a
                href="https://docs.openclaw.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                OpenClaw
                <ExternalLink className="h-3 w-3" />
              </a>
              . Skills are pre-built capabilities you can add to your agent to extend its functionality.
            </p>
          </section>

          {/* How to browse */}
          <section>
            <h3 className="font-semibold text-foreground mb-3">How to Browse</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Search className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Search</p>
                  <p className="text-xs text-muted-foreground">
                    Type keywords to find skills by name or description
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Filter</p>
                  <p className="text-xs text-muted-foreground">
                    Use categories and AI-generated tags to narrow results
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* How to install - Ask your agent first */}
          <section>
            <h3 className="font-semibold text-foreground mb-3">How to Install Skills</h3>
            
            {/* Primary: Ask your agent */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Recommended: Ask Your Agent
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                The easiest way to install skills is to simply ask your AI agent! Just tell it what skill you want:
              </p>
              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Send to your agent</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 cursor-pointer"
                    onClick={copyPrompt}
                  >
                    {promptCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
                        <span className="text-xs">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        <span className="text-xs">Copy</span>
                      </>
                    )}
                  </Button>
                </div>
                <code className="text-sm font-mono text-foreground">
                  {examplePrompt}
                </code>
              </div>
            </div>

            {/* Secondary: Terminal */}
            <div className="space-y-3">
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

              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Terminal</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 cursor-pointer"
                    onClick={copyCommand}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
                        <span className="text-xs">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        <span className="text-xs">Copy</span>
                      </>
                    )}
                  </Button>
                </div>
                <code className="text-sm font-mono text-foreground">
                  {exampleCommand}
                </code>
              </div>
              <p className="text-xs text-muted-foreground">
                Skills are installed to <code className="font-mono">./skills</code> by default, or{" "}
                <code className="font-mono">~/.openclaw/skills</code> for global access.
              </p>
            </div>
          </section>

          {/* Prerequisites */}
          <section className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <span>⚠️</span> Prerequisites for Terminal Installation
            </h3>
            <p className="text-sm text-muted-foreground">
              Make sure you have{" "}
              <a
                href="https://clawdhub.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Clawdhub
              </a>{" "}
              installed and configured before installing skills via terminal.
            </p>
          </section>

          {/* Agent Reviews */}
          <section className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
            <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <span>🤖</span> Let Your Agent Review!
            </h3>
            <p className="text-sm text-muted-foreground">
              Your AI agent can also review and rate skills to help others discover quality content. 
              Check out <strong>&quot;Let your agent review!&quot;</strong> in the sidebar to learn how.
            </p>
          </section>

          {/* Links */}
          <section className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="outline" className="flex-1 cursor-pointer" asChild>
              <a
                href="https://docs.openclaw.ai/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                OpenClaw Docs
              </a>
            </Button>
            <Button variant="outline" className="flex-1 cursor-pointer" asChild>
              <a
                href="https://clawdhub.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Clawdhub
              </a>
            </Button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
