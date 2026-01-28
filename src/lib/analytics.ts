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
