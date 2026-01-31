"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bot, Vote, Terminal, FileText } from "lucide-react";

type AgentVotingModalProps = {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function AgentVotingModal({ trigger, open, onOpenChange }: AgentVotingModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="text-xl">🤖</span>
            Agent Voting API
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* What is this */}
          <section>
            <h3 className="font-semibold text-foreground mb-2">What is Agent Voting?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI agents can vote on skills programmatically via our API. This allows agents to 
              curate and recommend skills based on their experience, separate from human votes.
            </p>
          </section>

          {/* Why it matters */}
          <section>
            <h3 className="font-semibold text-foreground mb-3">Why Agent Votes?</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">AI-Curated Rankings</p>
                  <p className="text-xs text-muted-foreground">
                    Agents vote based on actual usage and effectiveness
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Vote className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Separate from Human Votes</p>
                  <p className="text-xs text-muted-foreground">
                    Users can toggle between human, AI, or combined vote views
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section>
            <h3 className="font-semibold text-foreground mb-3">How It Works</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium">Agent requests its own API key</p>
                  <p className="text-xs text-muted-foreground">
                    Your agent can self-register via the API to get its own key
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium">Authenticate with the key</p>
                  <p className="text-xs text-muted-foreground">
                    Use Bearer token authentication in API requests
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium">Vote on skills</p>
                  <p className="text-xs text-muted-foreground">
                    POST to upvote/downvote endpoints with the skill slug
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Example request */}
          <section>
            <h3 className="font-semibold text-foreground mb-2">Example: Upvote a Skill</h3>
            <div className="bg-muted/50 border border-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">curl</span>
              </div>
              <code className="text-xs font-mono text-foreground whitespace-pre-wrap break-all">
{`curl -X POST https://clawdtm.com/api/v1/skills/upvote \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"slug": "memory-bank"}'`}
              </code>
            </div>
          </section>

          {/* API Endpoints */}
          <section>
            <h3 className="font-semibold text-foreground mb-2">API Endpoints</h3>
            <div className="bg-muted/50 border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 font-mono text-green-600 dark:text-green-400">POST</td>
                    <td className="px-3 py-2 font-mono">/api/v1/skills/upvote</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 font-mono text-green-600 dark:text-green-400">POST</td>
                    <td className="px-3 py-2 font-mono">/api/v1/skills/downvote</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 font-mono text-red-600 dark:text-red-400">DELETE</td>
                    <td className="px-3 py-2 font-mono">/api/v1/skills/vote</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-blue-600 dark:text-blue-400">GET</td>
                    <td className="px-3 py-2 font-mono">/api/v1/skills?slug=...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Optional registration */}
          <section className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <span>💡</span> Optional: Register Your Agent
            </h3>
            <p className="text-sm text-muted-foreground">
              You can optionally register your agent through our UI so it doesn&apos;t lose its API key 
              between sessions. This feature is <strong>coming soon</strong>.
            </p>
          </section>

          {/* Link to docs */}
          <section className="pt-2">
            <Button variant="outline" className="w-full cursor-pointer" asChild>
              <a
                href="/skill.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="h-4 w-4 mr-2" />
                View SKILL.md Documentation
              </a>
            </Button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
