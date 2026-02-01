"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "clawdtm_tour_completed";
const SESSION_FORCE_KEY = "clawdtm_force_tour";
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

  // Check localStorage, sessionStorage, and URL params on mount
  useEffect(() => {
    setIsClient(true);
    
    if (typeof window === "undefined") return;

    // Check for URL parameter to force tour: ?tour=1 or ?tour=true
    const urlParams = new URLSearchParams(window.location.search);
    const forceTourFromUrl = urlParams.get("tour") === "1" || urlParams.get("tour") === "true";
    
    // Check sessionStorage (persists across redirects like staging auth)
    const forceTourFromSession = sessionStorage.getItem(SESSION_FORCE_KEY) === "1";

    if (forceTourFromUrl) {
      // Store in sessionStorage so it survives staging auth redirect
      sessionStorage.setItem(SESSION_FORCE_KEY, "1");
      
      // Remove the tour param from URL without reload
      urlParams.delete("tour");
      const newUrl = urlParams.toString() 
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }

    if (forceTourFromUrl || forceTourFromSession) {
      // Clear the session flag
      sessionStorage.removeItem(SESSION_FORCE_KEY);
      
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

  // Expose startTour globally for console access
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as typeof window & { startTour?: () => void }).startTour = () => {
        localStorage.removeItem(STORAGE_KEY);
        setShouldShowTour(true);
        setRunTour(true);
        console.log("🦞 Tour started! Refresh the page if elements aren't highlighted.");
      };
    }
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
