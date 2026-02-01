"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "clawdtm_tour_completed";
const TOUR_VERSION = "1"; // Increment to re-show tour after major updates

type UseOnboardingReturn = {
  shouldShowTour: boolean;
  runTour: boolean;
  startTour: () => void;
  completeTour: () => void;
  resetTour: () => void;
  setRunTour: (run: boolean) => void;
};

export function useOnboarding(): UseOnboardingReturn {
  const [shouldShowTour, setShouldShowTour] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    setIsClient(true);
    
    if (typeof window === "undefined") return;

    const completedVersion = localStorage.getItem(STORAGE_KEY);
    const hasCompletedCurrentVersion = completedVersion === TOUR_VERSION;

    if (!hasCompletedCurrentVersion) {
      setShouldShowTour(true);
      // Small delay to let the page render before starting tour
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = useCallback(() => {
    setShouldShowTour(true);
    setRunTour(true);
  }, []);

  const completeTour = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, TOUR_VERSION);
    }
    setShouldShowTour(false);
    setRunTour(false);
  }, []);

  const resetTour = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    setShouldShowTour(true);
    setRunTour(true);
  }, []);

  return {
    shouldShowTour: isClient && shouldShowTour,
    runTour: isClient && runTour,
    startTour,
    completeTour,
    resetTour,
    setRunTour,
  };
}
