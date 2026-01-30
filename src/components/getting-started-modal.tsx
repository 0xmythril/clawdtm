"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, Search, SlidersHorizontal, Download, ExternalLink, Terminal } from "lucide-react";

type GettingStartedModalProps = {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function GettingStartedModal({ trigger, open, onOpenChange }: GettingStartedModalProps) {
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

          {/* How to install */}
          <section>
            <h3 className="font-semibold text-foreground mb-3">How to Install Skills</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium">Find a skill you like</p>
                  <p className="text-xs text-muted-foreground">
                    Browse or search, then click the Install button
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium">Copy the install command</p>
                  <p className="text-xs text-muted-foreground">
                    The modal will show the command to run
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium">Run in your terminal</p>
                  <p className="text-xs text-muted-foreground">
                    Paste and run the command in your project directory
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Example command */}
          <section>
            <h3 className="font-semibold text-foreground mb-2">Example</h3>
            <div className="bg-muted/50 border border-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Terminal</span>
              </div>
              <code className="text-sm font-mono text-foreground">
                clawdhub install web-search
              </code>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Skills are installed to <code className="font-mono">./skills</code> by default, or{" "}
              <code className="font-mono">~/.openclaw/skills</code> for global access.
            </p>
          </section>

          {/* Prerequisites */}
          <section className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <span>⚠️</span> Prerequisites
            </h3>
            <p className="text-sm text-muted-foreground">
              Make sure you have{" "}
              <a
                href="https://docs.openclaw.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                OpenClaw
              </a>{" "}
              installed and configured before installing skills.
            </p>
          </section>

          {/* Links */}
          <section className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="outline" className="flex-1" asChild>
              <a
                href="https://docs.openclaw.ai/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                OpenClaw Docs
              </a>
            </Button>
            <Button variant="outline" className="flex-1" asChild>
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
