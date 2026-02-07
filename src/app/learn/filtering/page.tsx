"use client";

import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  ShieldX,
  AlertTriangle,
  Eye,
  RefreshCw,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { ClawdTM as C } from "@/components/brand";

export default function FilteringPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-xl md:text-2xl font-bold mb-2">Our Filter Process</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          How <C /> keeps you safe — from automated scanning to human moderation.
        </p>
      </div>

      <div className="space-y-10">
        {/* ─── Overview ─── */}
        <section>
          <h2 className="text-lg font-semibold mb-3">How It Works</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Every skill that enters <C /> goes through a multi-layer trust pipeline.
            No skill reaches you without being analyzed first.
          </p>

          {/* Pipeline steps */}
          <div className="space-y-3">
            {[
              {
                step: "1",
                title: "Sync from ClawHub",
                description: "Skills are continuously synced from the ClawHub registry. New and updated skills are detected automatically.",
                color: "bg-blue-500/10 text-blue-500",
              },
              {
                step: "2",
                title: "AI Security Scan",
                description: "Each skill's source code is analyzed by our AI security engine, checking for 8 categories of risk. Every file — markdown, Python, JavaScript, shell scripts — is inspected.",
                color: "bg-green-500/10 text-green-500",
              },
              {
                step: "3",
                title: "Risk Scoring",
                description: "Skills are scored 0–100 and assigned a risk level. High-risk or critical skills can be automatically flagged for review.",
                color: "bg-yellow-500/10 text-yellow-500",
              },
              {
                step: "4",
                title: "Admin Review",
                description: "Moderators review flagged skills and can hide, verify, or feature them. Every action is logged in an audit trail for transparency.",
                color: "bg-purple-500/10 text-purple-500",
              },
              {
                step: "5",
                title: "Continuous Monitoring",
                description: "Skills are re-scanned every 15 minutes when changes are detected on GitHub. A skill that was safe yesterday gets flagged if it changes.",
                color: "bg-orange-500/10 text-orange-500",
              },
            ].map(({ step, title, description, color }) => (
              <div key={step} className="flex gap-3">
                <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center shrink-0 text-sm font-bold`}>
                  {step}
                </div>
                <div>
                  <h3 className="text-sm font-medium">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Security Checks ─── */}
        <section>
          <h2 className="text-lg font-semibold mb-3">What We Scan For</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Our AI security engine checks every skill against 8 risk categories:
          </p>

          <div className="grid gap-2">
            {[
              { icon: AlertTriangle, label: "Remote Execution", desc: "curl|bash, wget|sh, download-and-run patterns", color: "text-red-500" },
              { icon: Eye, label: "Obfuscated Code", desc: "Base64 encoding, packed scripts, hidden logic", color: "text-orange-500" },
              { icon: ShieldAlert, label: "Sensitive Data Access", desc: "Reading ~/.ssh, ~/.aws, credentials, tokens", color: "text-red-500" },
              { icon: AlertCircle, label: "Shell Commands", desc: "eval(), exec(), dangerous subprocess patterns", color: "text-yellow-500" },
              { icon: RefreshCw, label: "Network Requests", desc: "External API calls, outbound connections", color: "text-blue-500" },
              { icon: ShieldX, label: "Permission Escalation", desc: "sudo, root access, privilege elevation", color: "text-red-500" },
              { icon: AlertTriangle, label: "Data Exfiltration", desc: "Sending local data to external servers", color: "text-orange-500" },
              { icon: RefreshCw, label: "Persistence", desc: "Cron jobs, startup scripts, background processes", color: "text-yellow-500" },
            ].map(({ icon: Icon, label, desc, color }) => (
              <div key={label} className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${color}`} />
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Risk Levels ─── */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Risk Levels</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Each check results in a pass, warn, or fail. These are combined into an overall risk score:
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Low Risk</span>
                  <span className="text-xs text-muted-foreground">Score 70–89</span>
                </div>
                <p className="text-xs text-muted-foreground">All pass or minor warnings. No failed checks.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
              <Shield className="h-5 w-5 text-yellow-500 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">Medium</span>
                  <span className="text-xs text-muted-foreground">Score 50–69</span>
                </div>
                <p className="text-xs text-muted-foreground">1–2 warnings, or cannot fully verify safety. Use with caution.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
              <ShieldAlert className="h-5 w-5 text-orange-500 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">High Risk</span>
                  <span className="text-xs text-muted-foreground">Score 25–49</span>
                </div>
                <p className="text-xs text-muted-foreground">Failed checks detected, or multiple warnings. Review carefully before installing.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
              <ShieldX className="h-5 w-5 text-red-500 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400">Critical</span>
                  <span className="text-xs text-muted-foreground">Score 0–24</span>
                </div>
                <p className="text-xs text-muted-foreground">Multiple failures, clear malicious intent. Likely hidden by moderators.</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 px-1">
            <strong>Default visibility:</strong> Skills below Medium (i.e. High and Critical) are hidden from the registry by default. You can override this and show them using the Security filter in the Skills directory.
          </p>
        </section>

        {/* ─── Check results ─── */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Individual Check Results</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Each of the 8 security checks produces one of three results:
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 px-3 py-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              <div>
                <span className="text-sm font-medium">Pass</span>
                <span className="text-xs text-muted-foreground ml-2">No issues found for this category</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
              <div>
                <span className="text-sm font-medium">Warn</span>
                <span className="text-xs text-muted-foreground ml-2">Potentially concerning but may be legitimate</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-3 py-2">
              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
              <div>
                <span className="text-sm font-medium">Fail</span>
                <span className="text-xs text-muted-foreground ml-2">Clear risk identified in this category</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Admin Moderation ─── */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Admin Moderation</h2>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Beyond automated scanning, <C /> has a human moderation layer. Admins and
              moderators can:
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong>Hide skills</strong> — remove dangerous or low-quality skills from public listings. Hidden skills are invisible to regular users and API searches.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong>Hide by author</strong> — block all skills from an author if a pattern of malicious content is detected.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong>Verify skills</strong> — mark trusted skills with a verification badge, giving users extra confidence.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong>Feature skills</strong> — highlight exceptional skills in the directory.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong>Trigger rescans</strong> — manually rescan a skill or the entire registry if needed.</span>
              </li>
            </ul>
            <p>
              Every moderation action is recorded in an audit log with the actor, action, timestamp,
              and reasoning. This ensures transparency and accountability.
            </p>
          </div>
        </section>

        {/* ─── What this means for you ─── */}
        <section className="pb-12">
          <h2 className="text-lg font-semibold mb-3">What This Means for You</h2>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              When you browse <C /> or use the{" "}
              <Link href="/learn/advisor" className="text-primary hover:underline">
                Skill Advisor
              </Link>
              , you&apos;re only seeing skills that have passed through our filter process. Malicious
              and low-quality skills are hidden before they reach you.
            </p>
            <p>
              You can still make your own judgment calls using the security score and risk level
              displayed on every skill card. The{" "}
              <Link href="/" className="text-primary hover:underline">
                Skills directory
              </Link>{" "}
              lets you filter by security rating so you only see skills at the risk level
              you&apos;re comfortable with. Skills below Medium (High and Critical) are hidden by default; use the Security filter to show them if you want.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
