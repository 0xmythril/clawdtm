"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Shield,
  Download,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClawdTM as C } from "@/components/brand";

function getAdvisorInstruction() {
  if (typeof window === "undefined") return "";
  return `Read ${window.location.origin}/api/advisor/skill.md — learn this skill so you can help me search, evaluate, and install skills whenever I ask`;
}

export default function AdvisorPage() {
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
    <>
      <div className="mb-8">
        <h1 className="text-xl md:text-2xl font-bold mb-2 flex items-center gap-2">
          <span className="text-2xl">🔍</span>
          Skill Advisor
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Give your AI agent direct access to the <C /> database — search, evaluate security,
          and install skills through natural conversation.
        </p>
      </div>

      <div className="space-y-10">
        {/* ─── What is it ─── */}
        <section>
          <h2 className="text-lg font-semibold mb-3">What is the Skill Advisor?</h2>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              The Skill Advisor is a meta-skill — a skill that teaches your AI agent how to interact
              with <C />. Once installed, your agent can search over 5,000 skills, check security
              scores, read community reviews, and install skills directly.
            </p>
            <p>
              No API key required. No setup. Just copy one instruction to your agent and it learns
              the <C /> APIs. Works with any OpenClaw-compatible agent.
            </p>
          </div>
        </section>

        {/* ─── Quick Start ─── */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Quick Start</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Copy this instruction and send it to your AI agent:
          </p>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
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
            Your agent will read the skill documentation and become your personal skill advisor —
            ready to help whenever you ask.
          </p>
        </section>

        {/* ─── What your agent can do ─── */}
        <section>
          <h2 className="text-lg font-semibold mb-4">What Your Agent Can Do</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1">Search Skills</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your agent queries the <C /> search API to find skills matching your needs.
                  Results include descriptions, download counts, community ratings, and security scores.
                  You can ask for skills by category, popularity, or specific functionality.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1">Evaluate Security</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Before installing anything, your agent checks the security scan results.
                  It evaluates the overall risk score, examines individual security flags, and
                  presents a clear recommendation. High-risk skills are flagged with warnings.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1">Install Skills</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your agent fetches the skill files from GitHub and installs them locally into
                  your project. It handles the full workflow — confirming with you, downloading
                  files, and setting up the skill in the right directory.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Example conversations ─── */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Example Conversations</h2>
          <div className="space-y-3">
            {[
              {
                prompt: "Find me a skill for web scraping",
                response: (
                  <>
                    Your agent searches <C /> and presents top results with security scores, then asks which one you&apos;d like to install.
                  </>
                ),
              },
              {
                prompt: "Is the memory-bank skill safe?",
                response: "Your agent looks up the security scan results and explains the risk level, any flags found, and whether it recommends installation.",
              },
              {
                prompt: "Install a skill to help me trade crypto",
                response: "Your agent searches for trading-related skills, shows options with security ratings, and installs your choice after confirmation.",
              },
              {
                prompt: "What skills are popular right now?",
                response: "Your agent queries for trending skills sorted by downloads or community ratings and presents a curated list.",
              },
            ].map(({ prompt, response }) => (
              <div key={prompt} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-start gap-2 mb-2">
                  <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm font-medium italic">&ldquo;{prompt}&rdquo;</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed ml-5">{response}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── API Reference ─── */}
        <section>
          <h2 className="text-lg font-semibold mb-3">API Endpoints</h2>
          <p className="text-sm text-muted-foreground mb-4">
            The Skill Advisor uses these <C /> APIs under the hood:
          </p>
          <div className="space-y-2">
            <div className="rounded-lg bg-muted/50 p-3">
              <code className="text-xs font-mono text-primary">GET /api/v1/skills/search?q=...</code>
              <p className="text-xs text-muted-foreground mt-1">Search skills with security and community data</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <code className="text-xs font-mono text-primary">GET /api/v1/skills/install?slug=...</code>
              <p className="text-xs text-muted-foreground mt-1">Fetch skill files and metadata for installation</p>
            </div>
          </div>
          <div className="mt-3">
            <Button variant="outline" size="sm" className="cursor-pointer" asChild>
              <a href="/api/advisor/skill.md" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Full API Documentation
              </a>
            </Button>
          </div>
        </section>

        {/* ─── Security policy ─── */}
        <section className="pb-12">
          <h2 className="text-lg font-semibold mb-3">Built-in Security Policy</h2>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              The Skill Advisor follows a strict security policy when helping you:
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Always shows security scan results before recommending installation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Warns explicitly about medium, high, or critical risk skills</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Refuses to install critical-risk skills without explicit user consent</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Prioritizes safe and low-risk skills in search results</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Always asks for confirmation before installing anything</span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}
