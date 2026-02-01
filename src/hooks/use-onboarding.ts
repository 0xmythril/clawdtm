"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY_DESKTOP = "clawdtm_tour_completed_desktop";
const STORAGE_KEY_MOBILE = "clawdtm_tour_completed_mobile";
const SESSION_FORCE_KEY = "clawdtm_force_tour";
const TOUR_VERSION = "1"; // Increment to re-show tour after major updates

// Breakpoint matching Tailwind's md: (768px)
const MOBILE_BREAKPOINT = 768;

type DeviceType = "mobile" | "desktop";

type UseOnboardingReturn = {
  shouldShowTour: boolean;
  runTour: boolean;
  startTour: () => void;
  completeTour: () => void;
  resetTour: () => void;
  setRunTour: (run: boolean) => void;
  isMobile: boolean;
};

function getDeviceType(): DeviceType {
  if (typeof window === "undefined") return "desktop";
  return window.innerWidth < MOBILE_BREAKPOINT ? "mobile" : "desktop";
}

function getStorageKey(deviceType: DeviceType): string {
  return deviceType === "mobile" ? STORAGE_KEY_MOBILE : STORAGE_KEY_DESKTOP;
}

export function useOnboarding(): UseOnboardingReturn {
  const [shouldShowTour, setShouldShowTour] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop");

  // Track device type and handle resize
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateDeviceType = () => {
      const newDeviceType = getDeviceType();
      setDeviceType(newDeviceType);
    };

    updateDeviceType();

    // Only update on significant resize (prevents tour restart on minor resizes)
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newDeviceType = getDeviceType();
        if (newDeviceType !== deviceType) {
          setDeviceType(newDeviceType);
          // Stop current tour if device type changed mid-tour
          if (runTour) {
            setRunTour(false);
          }
        }
      }, 250);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [deviceType, runTour]);

  // Check localStorage, sessionStorage, and URL params on mount
  useEffect(() => {
    setIsClient(true);
    
    if (typeof window === "undefined") return;

    const currentDeviceType = getDeviceType();
    const storageKey = getStorageKey(currentDeviceType);

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
      
      // Reset and start tour for current device type
      localStorage.removeItem(storageKey);
      setShouldShowTour(true);
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 2000); // Longer delay to ensure skills are loaded
      return () => clearTimeout(timer);
    }

    const completedVersion = localStorage.getItem(storageKey);
    const hasCompletedCurrentVersion = completedVersion === TOUR_VERSION;

    if (!hasCompletedCurrentVersion) {
      setShouldShowTour(true);
      // Wait for skills to load before starting tour
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = useCallback(() => {
    setShouldShowTour(true);
    setRunTour(true);
  }, []);

  const completeTour = useCallback(() => {
    if (typeof window !== "undefined") {
      const storageKey = getStorageKey(deviceType);
      localStorage.setItem(storageKey, TOUR_VERSION);
    }
    setShouldShowTour(false);
    setRunTour(false);
  }, [deviceType]);

  const resetTour = useCallback(() => {
    if (typeof window !== "undefined") {
      const storageKey = getStorageKey(deviceType);
      localStorage.removeItem(storageKey);
    }
    setShouldShowTour(true);
    setRunTour(true);
  }, [deviceType]);

  // Expose startTour globally for console access
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as typeof window & { startTour?: () => void }).startTour = () => {
        const currentDeviceType = getDeviceType();
        const storageKey = getStorageKey(currentDeviceType);
        localStorage.removeItem(storageKey);
        setShouldShowTour(true);
        // Wait for any loading to complete
        setTimeout(() => {
          setRunTour(true);
          console.log(`🦞 Tour started! (${currentDeviceType} version)`);
        }, 1000);
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
    isMobile: deviceType === "mobile",
  };
}
