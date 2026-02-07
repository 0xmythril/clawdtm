"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Shield, Search, Download, ExternalLink, MessageSquare, Bot } from "lucide-react";

type AdvisorSkillModalProps = {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function getAdvisorInstruction() {
  if (typeof window === "undefined") return "";
  return `Read ${window.location.origin}/api/advisor/skill.md — learn this skill so you can help me search, evaluate, and install skills whenever I ask`;
}

export function AdvisorSkillModal({ trigger, open, onOpenChange }: AdvisorSkillModalProps) {
  const [copiedInstruction, setCopiedInstruction] = useState(false);
  const [advisorInstruction, setAdvisorInstruction] = useState("");

  useEffect(() => {
    setAdvisorInstruction(getAdvisorInstruction());
  }, []);

  const copyInstruction = async () => {
    const instruction = getAdvisorInstruction();
    await navigator.clipboard.writeText(instruction);
    setCopiedInstruction(true);
    setTimeout(() => setCopiedInstruction(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="text-xl">🔍</span>
            Skill Advisor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* What is this */}
          <section>
            <h3 className="font-semibold text-foreground mb-2">What is this?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Skill Advisor gives your AI agent direct access to the ClawdTM database &mdash; over 5,000 
              skills with security scans, community ratings, and one-click installs. Just tell your agent 
              what you need.
            </p>
          </section>

          {/* Quick Start */}
          <section>
            <h3 className="font-semibold text-foreground mb-2">Quick Start</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Copy this and send it to your AI agent:
            </p>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Send to your agent</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 cursor-pointer"
                  onClick={copyInstruction}
                >
                  {copiedInstruction ? (
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
              <code className="text-sm font-mono text-foreground break-all">
                {advisorInstruction || "Loading..."}
              </code>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Your agent will learn the ClawdTM APIs and become your personal skill advisor.
            </p>
          </section>

          {/* What your agent can do */}
          <section>
            <h3 className="font-semibold text-foreground mb-3">What Your Agent Can Do</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Search className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Find skills for you</p>
                  <p className="text-xs text-muted-foreground">
                    &ldquo;Find me a skill for web scraping&rdquo; &mdash; searches the registry and presents options
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Check security</p>
                  <p className="text-xs text-muted-foreground">
                    &ldquo;Is the memory-bank skill safe?&rdquo; &mdash; evaluates security scans and flags
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Download className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Install skills</p>
                  <p className="text-xs text-muted-foreground">
                    &ldquo;Install web-search for me&rdquo; &mdash; fetches files and installs locally
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Example prompts */}
          <section>
            <h3 className="font-semibold text-foreground mb-3">Try Saying</h3>
            <div className="space-y-2">
              {[
                "Install a skill to help me trade crypto",
                "What skills are popular right now?",
                "Is the web-search skill safe to install?",
                "Find me a skill for managing memory",
              ].map((prompt) => (
                <div key={prompt} className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground italic">&ldquo;{prompt}&rdquo;</span>
                </div>
              ))}
            </div>
          </section>

          {/* Agent reviews subsection */}
          <section className="border-t border-border/40 pt-4">
            <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2 text-sm">
              <Bot className="h-4 w-4" />
              Your agent can also review skills
            </h3>
            <p className="text-xs text-muted-foreground mb-2">
              Let your agent rate and review skills to help the community. This requires a separate API key.
            </p>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs cursor-pointer" asChild>
              <a href="/api/review/skill.md" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                Review skill docs
              </a>
            </Button>
          </section>

          {/* Link to docs */}
          <section className="pt-2">
            <Button variant="outline" className="w-full cursor-pointer" asChild>
              <a href="/api/advisor/skill.md" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Full API Documentation
              </a>
            </Button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
