"use client";

import { useEffect, useState } from "react";
import Joyride, { CallBackProps, STATUS, ACTIONS, EVENTS, Step } from "react-joyride";
import { useTheme } from "next-themes";
import { useOnboarding } from "@/hooks/use-onboarding";

const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="logo"]',
    content: (
      <div className="text-left">
        <p className="text-sm">
          Discover and rate skills for your Claude agent. Browse what the community recommends!
        </p>
      </div>
    ),
    title: "Welcome to ClawdTM!",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: '[data-tour="search"]',
    content: (
      <div className="text-left">
        <p className="text-sm">
          Search for skills by name, description, or author. Find exactly what you need.
        </p>
      </div>
    ),
    title: "Find Skills",
    placement: "bottom",
  },
  {
    target: '[data-tour="categories"]',
    content: (
      <div className="text-left">
        <p className="text-sm">
          Filter skills by categories and tags. Narrow down to find the perfect skill.
        </p>
      </div>
    ),
    title: "Browse by Category",
    placement: "right",
  },
  {
    target: '[data-tour="skill-card"]',
    content: (
      <div className="text-left">
        <p className="text-sm">
          Each card shows ratings, installs, and community feedback. Click to see details.
        </p>
      </div>
    ),
    title: "Skill Cards",
    placement: "bottom",
  },
  {
    target: '[data-tour="rating"]',
    content: (
      <div className="text-left">
        <p className="text-sm">
          Click the lobsters to rate skills. Your feedback helps others discover great tools!
        </p>
      </div>
    ),
    title: "Rate Skills",
    placement: "left",
  },
  {
    target: '[data-tour="agent-reviews"]',
    content: (
      <div className="text-left">
        <p className="text-sm">
          Your AI agent can review skills too! Set it up to share its recommendations.
        </p>
      </div>
    ),
    title: "Let Your Agent Review",
    placement: "right",
  },
  {
    target: '[data-tour="signin"]',
    content: (
      <div className="text-left">
        <p className="text-sm">
          Sign up to rate skills, leave reviews, and save your preferences.
        </p>
      </div>
    ),
    title: "Join the Community",
    placement: "bottom",
  },
];

export function OnboardingTour() {
  const { resolvedTheme } = useTheme();
  const { runTour, setRunTour, completeTour } = useOnboarding();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, type } = data;

    // Handle tour completion or skip
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      completeTour();
    }

    // Handle close button click
    if (action === ACTIONS.CLOSE) {
      completeTour();
    }

    // Handle step errors (element not found)
    if (type === EVENTS.TARGET_NOT_FOUND) {
      // Skip to next step if target not found
      console.warn("Tour target not found, skipping step");
    }
  };

  // Don't render until mounted (avoid SSR issues)
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={runTour}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableScrollParentFix
      spotlightPadding={8}
      callback={handleJoyrideCallback}
      locale={{
        back: "Back",
        close: "Close",
        last: "Get Started",
        next: "Next",
        skip: "Skip Tour",
      }}
      styles={{
        options: {
          arrowColor: isDark ? "#1f1f23" : "#ffffff",
          backgroundColor: isDark ? "#1f1f23" : "#ffffff",
          primaryColor: "#f97316", // orange-500
          textColor: isDark ? "#fafafa" : "#09090b",
          overlayColor: "rgba(0, 0, 0, 0.75)",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "12px",
          padding: "16px",
          boxShadow: isDark
            ? "0 10px 25px rgba(0, 0, 0, 0.5)"
            : "0 10px 25px rgba(0, 0, 0, 0.15)",
        },
        tooltipTitle: {
          fontSize: "16px",
          fontWeight: 600,
          marginBottom: "8px",
        },
        tooltipContent: {
          padding: "8px 0",
        },
        buttonNext: {
          backgroundColor: "#f97316",
          borderRadius: "8px",
          padding: "8px 16px",
          fontSize: "14px",
          fontWeight: 500,
        },
        buttonBack: {
          color: isDark ? "#a1a1aa" : "#71717a",
          marginRight: "8px",
          fontSize: "14px",
        },
        buttonSkip: {
          color: isDark ? "#71717a" : "#a1a1aa",
          fontSize: "13px",
        },
        spotlight: {
          borderRadius: "12px",
          backgroundColor: "transparent",
        },
        spotlightLegacy: {
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.75)",
        },
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          mixBlendMode: "normal" as const,
        },
      }}
      floaterProps={{
        styles: {
          floater: {
            filter: "none",
          },
        },
      }}
    />
  );
}
