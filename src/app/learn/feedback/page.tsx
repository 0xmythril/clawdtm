"use client";

import { useState } from "react";
import { SignInButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Send, LogIn, Check, Bug, Lightbulb, MessageSquare, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClawdTM as C } from "@/components/brand";

type FeedbackType = "bug" | "feature" | "security" | "general";

const FEEDBACK_TYPES: { value: FeedbackType; label: string; icon: typeof Bug; description: string }[] = [
  { value: "bug", label: "Bug Report", icon: Bug, description: "Something isn't working right" },
  { value: "feature", label: "Feature Request", icon: Lightbulb, description: "An idea for improvement" },
  { value: "security", label: "Security Concern", icon: Shield, description: "Report a malicious skill or vulnerability" },
  { value: "general", label: "General Feedback", icon: MessageSquare, description: "Anything else" },
];

export default function FeedbackPage() {
  const { user } = useUser();
  const submitFeedback = useMutation(api.feedback.submitFeedback);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authRedirectUrl = typeof window !== "undefined" ? window.location.href : "/learn/feedback";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user?.id) return;

    setSubmitting(true);
    setError(null);

    try {
      await submitFeedback({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName ?? user.username ?? undefined,
        type: feedbackType,
        subject: subject.trim() || undefined,
        message: message.trim(),
      });
      setSubmitted(true);
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-xl md:text-2xl font-bold mb-2 flex items-center gap-2">
          <span className="text-2xl">💬</span>
          Feedback &amp; Report
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Help us improve <C /> — report bugs, suggest features, or flag security concerns.
        </p>
      </div>

      <div className="space-y-8 pb-12">
        <SignedOut>
          <div className="rounded-lg border border-border/60 p-6 text-center">
            <LogIn className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Sign in to leave feedback</h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              We require authentication to prevent spam and so we can follow up with you
              if needed. Your feedback is valuable to us.
            </p>
            <SignInButton
              mode="modal"
              forceRedirectUrl={authRedirectUrl}
              signUpForceRedirectUrl={authRedirectUrl}
            >
              <Button className="cursor-pointer">
                <LogIn className="h-4 w-4 mr-2" />
                Sign in to continue
              </Button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          {submitted ? (
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-6 text-center">
              <Check className="h-8 w-8 text-green-500 mx-auto mb-3" />
              <h2 className="text-lg font-semibold mb-2">Thank you!</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Your feedback has been received. We review all submissions and will
                take action where needed.
              </p>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => setSubmitted(false)}
              >
                Send more feedback
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Feedback type */}
              <div>
                <label className="text-sm font-medium mb-3 block">What type of feedback?</label>
                <div className="grid grid-cols-2 gap-2">
                  {FEEDBACK_TYPES.map(({ value, label, icon: Icon, description }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFeedbackType(value)}
                      className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                        feedbackType === value
                          ? "border-primary bg-primary/5"
                          : "border-border/60 hover:border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-4 w-4 ${feedbackType === value ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="text-sm font-medium mb-1.5 block">
                  Subject
                </label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={
                    feedbackType === "bug"
                      ? "e.g., Security score not showing on skill card"
                      : feedbackType === "feature"
                        ? "e.g., Add skill comparison feature"
                        : feedbackType === "security"
                          ? "e.g., Suspicious skill: memory-stealer"
                          : "e.g., Great platform!"
                  }
                  className="h-10"
                />
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="text-sm font-medium mb-1.5 block">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us more..."
                  required
                  rows={5}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-y min-h-[120px] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
              </div>

              {/* Submitting as */}
              {user && (
                <p className="text-xs text-muted-foreground">
                  Submitting as{" "}
                  <span className="font-medium text-foreground">
                    {user.primaryEmailAddress?.emailAddress ?? user.username ?? "you"}
                  </span>
                </p>
              )}

              {/* Error */}
              {error && (
                <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={!message.trim() || submitting}
                className="cursor-pointer"
              >
                {submitting ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Feedback
                  </>
                )}
              </Button>
            </form>
          )}
        </SignedIn>

        {/* Alternative channels */}
        <section className="border-t border-border/40 pt-6">
          <h3 className="text-sm font-semibold mb-3">Other Ways to Reach Us</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <a
                href="https://discord.gg/eTtG4rhbp6"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Discord
              </a>{" "}
              — Join the community for real-time discussions and support.
            </p>
            <p>
              <a
                href="https://github.com/0xmythril/clawdtm/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub Issues
              </a>{" "}
              — Report bugs or request features directly on the repo.
            </p>
            <p>
              <a
                href="https://x.com/0xmythril"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Twitter/X
              </a>{" "}
              — DM for quick questions or feedback.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
