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
import { Bot, Copy, Check, Loader2 } from "lucide-react";

type AgentReviewsModalProps = {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function AgentReviewsModal({ trigger, open, onOpenChange }: AgentReviewsModalProps) {
  const [skillMd, setSkillMd] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch("/skill.md")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load SKILL.md");
        return res.text();
      })
      .then(setSkillMd)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [open]);

  const handleCopy = async () => {
    if (!skillMd) return;
    try {
      await navigator.clipboard.writeText(skillMd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span className="text-xl">🤖</span>
              Let Your Agent Vote!
            </DialogTitle>
            {skillMd && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copied ? "Copied!" : "Copy SKILL.md"}
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Your AI agent can vote and review skills via our API. Copy the SKILL.md below and add it to your agent&apos;s context to get started.
          </p>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              Loading SKILL.md...
            </div>
          )}
          {error && (
            <div className="py-6 text-sm text-destructive">
              {error}
            </div>
          )}
          {skillMd && !loading && (
            <div className="flex-1 min-h-[320px] max-h-[60vh] overflow-auto rounded-lg border border-zinc-700 bg-zinc-900">
              <pre
                className="p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words text-zinc-200"
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
              >
                {skillMd}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
