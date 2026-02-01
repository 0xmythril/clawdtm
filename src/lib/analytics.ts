/**
 * Google Analytics 4 event tracking utilities
 * 
 * Events are sent directly to GA4 using gtag().
 */

declare global {
  interface Window {
    gtag: (
      command: string,
      targetId: string,
      config?: Record<string, unknown>
    ) => void;
  }
}

/**
 * Send an event directly to GA4
 */
export function trackEvent(eventName: string, eventParams?: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.gtag) return;

  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
  if (!measurementId) return;

  window.gtag("event", eventName, {
    ...eventParams,
  });
}

/**
 * Track skill install click
 */
export function trackSkillInstall(skillSlug: string, skillName: string) {
  trackEvent("skill_install_click", {
    skill_slug: skillSlug,
    skill_name: skillName,
  });
}

/**
 * Track search query
 */
export function trackSearch(query: string, resultCount: number) {
  trackEvent("search", {
    search_term: query,
    result_count: resultCount,
  });
}

/**
 * Track category filter change
 */
export function trackCategoryFilter(category: string) {
  trackEvent("filter_category", {
    category,
  });
}

/**
 * Track tag filter toggle
 */
export function trackTagFilter(tag: string, action: "add" | "remove") {
  trackEvent("filter_tag", {
    tag,
    action,
  });
}

/**
 * Track sort change
 */
export function trackSortChange(sortBy: string) {
  trackEvent("sort_change", {
    sort_by: sortBy,
  });
}

/**
 * Track view mode change
 */
export function trackViewModeChange(mode: "card" | "list") {
  trackEvent("view_mode_change", {
    view_mode: mode,
  });
}

/**
 * Track external link click
 */
export function trackExternalLink(url: string, linkType: string) {
  trackEvent("external_link_click", {
    link_url: url,
    link_type: linkType,
  });
}

/**
 * Track pagination (load more)
 */
export function trackLoadMore(currentCount: number) {
  trackEvent("load_more", {
    current_count: currentCount,
  });
}

// ============================================
// Onboarding Tour Tracking
// ============================================

/**
 * Track tour started
 */
export function trackTourStarted() {
  trackEvent("tour_started", {
    timestamp: Date.now(),
  });
}

/**
 * Track tour step view
 */
export function trackTourStepView(stepName: string, stepIndex: number) {
  trackEvent("tour_step_view", {
    step_name: stepName,
    step_index: stepIndex,
  });
}

/**
 * Track tour navigation (next/back)
 */
export function trackTourNavigation(action: "next" | "back", fromStep: number) {
  trackEvent(`tour_${action}_clicked`, {
    from_step: fromStep,
  });
}

/**
 * Track tour completed
 */
export function trackTourCompleted(stepsViewed: number, durationMs: number) {
  trackEvent("tour_completed", {
    steps_viewed: stepsViewed,
    duration_seconds: Math.round(durationMs / 1000),
  });
}

/**
 * Track tour skipped
 */
export function trackTourSkipped(skippedAtStep: string, stepIndex: number) {
  trackEvent("tour_skipped", {
    skipped_at_step: skippedAtStep,
    step_index: stepIndex,
  });
}

// ============================================
// User Lifecycle Tracking
// ============================================

/**
 * Track first visit (new user)
 */
export function trackFirstVisit() {
  trackEvent("first_visit", {
    timestamp: Date.now(),
  });
}

/**
 * Track user sign up
 */
export function trackUserSignedUp() {
  trackEvent("user_signed_up", {
    timestamp: Date.now(),
  });
}

/**
 * Track user sign in
 */
export function trackUserSignedIn() {
  trackEvent("user_signed_in", {
    timestamp: Date.now(),
  });
}

/**
 * Track review submitted
 */
export function trackReviewSubmitted(skillSlug: string, rating: number, hasText: boolean) {
  trackEvent("review_submitted", {
    skill_slug: skillSlug,
    rating,
    has_text: hasText,
  });
}

/**
 * Track rating submitted (rating only, no text)
 */
export function trackRatingSubmitted(skillSlug: string, rating: number) {
  trackEvent("rating_submitted", {
    skill_slug: skillSlug,
    rating,
  });
}

// ============================================
// UTM Campaign Tracking
// ============================================

const UTM_STORAGE_KEY = "clawdtm_utm";

export interface UTMParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
}

/**
 * Capture and store UTM parameters from URL
 */
export function captureUTMParams(): UTMParams | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const utm: UTMParams = {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_content: params.get("utm_content"),
    utm_term: params.get("utm_term"),
  };

  // Only store if we have at least a source
  if (utm.utm_source) {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
    return utm;
  }

  return null;
}

/**
 * Get stored UTM params from session
 */
export function getStoredUTMParams(): UTMParams | null {
  if (typeof window === "undefined") return null;

  const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Track page view with user type and UTM data
 */
export function trackPageView() {
  if (typeof window === "undefined") return;

  const FIRST_VISIT_KEY = "clawdtm_first_visit";
  const isReturningUser = localStorage.getItem(FIRST_VISIT_KEY);

  if (!isReturningUser) {
    localStorage.setItem(FIRST_VISIT_KEY, Date.now().toString());
    trackFirstVisit();
  }

  // Capture UTM params if present
  const utm = captureUTMParams() || getStoredUTMParams();

  trackEvent("page_view", {
    user_type: isReturningUser ? "returning" : "new",
    ...(utm || {}),
  });
}
