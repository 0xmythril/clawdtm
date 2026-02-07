"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Search, Shield, Download, ArrowRight } from "lucide-react";

const STORAGE_KEY = "clawdtm_first_visit_modal_shown";

function getAdvisorInstruction() {
  if (typeof window === "undefined") return "";
  return `Read ${window.location.origin}/api/advisor/skill.md — learn this skill so you can help me search, evaluate, and install skills whenever I ask`;
}

type FirstVisitModalProps = {
  /** Whether the tour has finished (completed or skipped). Modal shows after tour ends. */
  tourFinished: boolean;
};

export function FirstVisitModal({ tourFinished }: FirstVisitModalProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [instruction, setInstruction] = useState("");

  useEffect(() => {
    setInstruction(getAdvisorInstruction());
  }, []);

  // Show modal after tour finishes, if never shown before
  useEffect(() => {
    if (!tourFinished) return;
    if (typeof window === "undefined") return;

    const alreadyShown = localStorage.getItem(STORAGE_KEY);
    if (alreadyShown) return;

    // Small delay after tour so it doesn't feel jarring
    const timer = setTimeout(() => {
      setOpen(true);
    }, 600);

    return () => clearTimeout(timer);
  }, [tourFinished]);

  const handleClose = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "1");
    }
  }, []);

  const copyInstruction = async () => {
    const inst = getAdvisorInstruction();
    await navigator.clipboard.writeText(inst);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span>🦞</span>
            One more thing&hellip;
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            Supercharge your agent with the ClawdTM Skill Advisor
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Value prop - compact icons row */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Search className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-xs text-muted-foreground">Search skills</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-green-500" />
              </div>
              <span className="text-xs text-muted-foreground">Check security</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Download className="h-5 w-5 text-purple-500" />
              </div>
              <span className="text-xs text-muted-foreground">Install safely</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            Install the <strong>Skill Advisor</strong> to give your agent direct access to the ClawdTM 
            database &mdash; thousands of skills with security scans and community ratings. Just 
            say <em>&ldquo;find me a skill for&hellip;&rdquo;</em> and it handles the rest.
          </p>

          {/* Copy instruction */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground">Send this to your agent:</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 cursor-pointer"
                onClick={copyInstruction}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
                    <span className="text-xs">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">Copy</span>
                  </>
                )}
              </Button>
            </div>
            <code className="text-sm font-mono text-foreground break-all leading-relaxed">
              {instruction || "Loading..."}
            </code>
          </div>

          {/* CTA */}
          <div className="flex gap-2">
            <Button
              variant="default"
              className="flex-1 cursor-pointer"
              onClick={copyInstruction}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy &amp; Get Started
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              className="cursor-pointer"
              onClick={() => handleClose(false)}
            >
              Later
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
