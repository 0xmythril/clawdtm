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

  // Check localStorage and URL params on mount
  useEffect(() => {
    setIsClient(true);
    
    if (typeof window === "undefined") return;

    // Check for URL parameter to force tour: ?tour=1 or ?tour=true
    const urlParams = new URLSearchParams(window.location.search);
    const forceTour = urlParams.get("tour") === "1" || urlParams.get("tour") === "true";

    if (forceTour) {
      // Remove the tour param from URL without reload
      urlParams.delete("tour");
      const newUrl = urlParams.toString() 
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
      
      // Reset and start tour
      localStorage.removeItem(STORAGE_KEY);
      setShouldShowTour(true);
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 500);
      return () => clearTimeout(timer);
    }

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
