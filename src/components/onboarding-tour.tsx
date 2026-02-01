"use client";

import { useEffect, useState, useRef } from "react";
import Joyride, { CallBackProps, STATUS, ACTIONS, EVENTS, Step } from "react-joyride";
import { useTheme } from "next-themes";
import { useOnboarding } from "@/hooks/use-onboarding";
import {
  trackTourStarted,
  trackTourStepView,
  trackTourNavigation,
  trackTourCompleted,
  trackTourSkipped,
} from "@/lib/analytics";

// Desktop tour steps - targets sidebar elements
const DESKTOP_TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="logo"]',
    content: (
      <div className="text-left">
        <p className="text-sm">
          Welcome! Discover skills for your Claude agent and see what the community recommends. 🎉
        </p>
      </div>
    ),
    title: "Hey there! 👋",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: '[data-tour="search"]',
    content: (
      <div className="text-left">
        <p className="text-sm">
          Looking for something specific? Search by name, description, or author.
        </p>
      </div>
    ),
    title: "🔍 Find Skills",
    placement: "bottom",
  },
  {
    target: '[data-tour="skill-card"]',
    content: (
      <div className="text-left">
        <p className="text-sm">
          Each card shows ratings, installs, and feedback at a glance. Click any card for more details!
        </p>
      </div>
    ),
    title: "✨ Skill Cards",
    placement: "bottom",
  },
  {
    target: '[data-tour="rating"]',
    content: (
      <div className="text-left">
        <p className="text-sm">
          Click the lobsters to rate! Your feedback helps others find great tools.
        </p>
      </div>
    ),
    title: "🦞 Rate Skills",
    placement: "left",
  },
  {
    target: '[data-tour="categories"]',
    content: (
      <div className="text-left">
        <p className="text-sm">
          All your filtering tools in one place! Browse by category, set a minimum rating, or explore AI-generated tags.
        </p>
      </div>
    ),
    title: "🎛️ Skill Filters",
    placement: "right",
  },
  {
    target: '[data-tour="agent-reviews"]',
    content: (
      <div className="text-left">
        <p className="text-sm">
          <strong>Did you know?</strong> Your AI agent can review skills too! Click here to set it up and let your agent share its recommendations with the community.
        </p>
      </div>
    ),
    title: "🤖 Let Your Agent Vote",
    placement: "right",
  },
  {
    target: '[data-tour="signin"]',
    content: (
      <div className="text-left">
        <p className="text-sm">
          Sign up to rate skills, leave reviews, and join the community!
        </p>
      </div>
    ),
    title: "🚀 Get Started",
    placement: "bottom",
  },
];

// Mobile tour steps - targets bottom nav and visible elements
const MOBILE_TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="mobile-logo"]',
    content: (
      <div className="text-left">
        <p className="text-sm">
          Welcome! Discover skills for your Claude agent and see what the community recommends. 🎉
        </p>
      </div>
    ),
    title: "Hey there! 👋",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: '[data-tour="skill-card"]',
    content: (
      <div className="text-left">
        <p className="text-sm">
          Each card shows ratings, installs, and feedback at a glance. Tap any card for more details!
        </p>
      </div>
    ),
    title: "✨ Skill Cards",
    placement: "top",
  },
  {
    target: '[data-tour="rating"]',
    content: (
      <div className="text-left">
        <p className="text-sm">
          Tap the lobsters to rate! Your feedback helps others find great tools.
        </p>
      </div>
    ),
    title: "🦞 Rate Skills",
    placement: "top",
  },
  {
    target: '[data-tour="mobile-search"]',
    content: (
      <div className="text-left">
        <p className="text-sm">
          Looking for something specific? Tap here to search by name, description, or author.
        </p>
      </div>
    ),
    title: "🔍 Find Skills",
    placement: "top",
  },
  {
    target: '[data-tour="mobile-filters"]',
    content: (
      <div className="text-left">
        <p className="text-sm">
          Filter by category, set a minimum rating, or explore AI-generated tags to find the perfect skill.
        </p>
      </div>
    ),
    title: "🎛️ Skill Filters",
    placement: "top",
  },
  {
    target: '[data-tour="mobile-settings"]',
    content: (
      <div className="text-left">
        <p className="text-sm">
          Sign in to rate skills, let your AI agent leave reviews, and customize your experience!
        </p>
      </div>
    ),
    title: "⚙️ Settings & Account",
    placement: "top",
  },
];

// Step names for analytics
const DESKTOP_STEP_NAMES = ["welcome", "search", "skill_card", "rating", "filters", "agent_reviews", "signin"];
const MOBILE_STEP_NAMES = ["welcome", "skill_card", "rating", "search", "filters", "settings"];

export function OnboardingTour() {
  const { resolvedTheme } = useTheme();
  const { runTour, completeTour, isMobile } = useOnboarding();
  const [mounted, setMounted] = useState(false);
  
  // Select appropriate steps based on device type
  const tourSteps = isMobile ? MOBILE_TOUR_STEPS : DESKTOP_TOUR_STEPS;
  const stepNames = isMobile ? MOBILE_STEP_NAMES : DESKTOP_STEP_NAMES;
  
  // Tracking state
  const tourStartTime = useRef<number | null>(null);
  const stepsViewed = useRef<Set<number>>(new Set());
  const hasTrackedStart = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track tour start when runTour becomes true
  useEffect(() => {
    if (runTour && !hasTrackedStart.current) {
      hasTrackedStart.current = true;
      tourStartTime.current = Date.now();
      trackTourStarted(isMobile ? "mobile" : "desktop");
    }
  }, [runTour, isMobile]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, type, index } = data;
    const stepName = stepNames[index] || `step_${index}`;

    // Track step views
    if (type === EVENTS.STEP_AFTER && !stepsViewed.current.has(index)) {
      stepsViewed.current.add(index);
      trackTourStepView(stepName, index);
    }

    // Track navigation
    if (action === ACTIONS.NEXT && type === EVENTS.STEP_AFTER) {
      trackTourNavigation("next", index);
    }
    if (action === ACTIONS.PREV && type === EVENTS.STEP_AFTER) {
      trackTourNavigation("back", index);
    }

    // Handle tour completion
    if (status === STATUS.FINISHED) {
      const duration = tourStartTime.current ? Date.now() - tourStartTime.current : 0;
      trackTourCompleted(stepsViewed.current.size, duration);
      completeTour();
    }

    // Handle tour skip
    if (status === STATUS.SKIPPED) {
      trackTourSkipped(stepName, index);
      completeTour();
    }

    // Handle close button click
    if (action === ACTIONS.CLOSE) {
      trackTourSkipped(stepName, index);
      completeTour();
    }

    // Handle step errors (element not found)
    if (type === EVENTS.TARGET_NOT_FOUND) {
      console.warn("Tour target not found, skipping step");
    }
  };

  // Don't render until mounted (avoid SSR issues)
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <Joyride
      steps={tourSteps}
      run={runTour}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      spotlightPadding={10}
      disableOverlayClose={false}
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
          overlayColor: "rgba(0, 0, 0, 0.8)",
          spotlightShadow: "0 0 15px rgba(0, 0, 0, 0.5)",
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
          borderRadius: "8px",
        },
      }}
    />
  );
}
