"use client";

import { Suspense, useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { Sidebar, type SecurityFilter } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { SearchBar, type SearchBarRef, type ReviewerFilter } from "@/components/search-bar";
import { SkillCard, type Skill } from "@/components/skill-card";
import { InstallModal } from "@/components/install-modal";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Copy, Check, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { OnboardingTour } from "@/components/onboarding-tour";
import { FirstVisitModal } from "@/components/first-visit-modal";
import type { Id } from "../../convex/_generated/dataModel";
import {
  trackSearch,
  trackCategoryFilter,
  trackTagFilter,
  trackSortChange,
  trackViewModeChange,
  trackLoadMore,
  trackSkillInstall,
  trackExternalLink,
  trackPageView,
} from "@/lib/analytics";

type SortOption = "downloads" | "stars" | "installs" | "rating" | "reviews" | "recent";
type ViewMode = "card" | "list";

// Loading fallback for Suspense
function SkillsLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading skills...</p>
      </div>
    </div>
  );
}

// Main page content - separated to wrap in Suspense
function SkillsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchBarRef = useRef<SearchBarRef>(null);
  const { user, isLoaded: userLoaded } = useUser();

  // URL state
  const urlQuery = searchParams.get("q") ?? "";
  const urlCategory = searchParams.get("category") ?? "all";
  const urlSort = (searchParams.get("sort") as SortOption) ?? "rating";
  const urlReviewerFilter = (searchParams.get("reviewer") as ReviewerFilter) ?? "all";
  const urlMinRating = parseInt(searchParams.get("minRating") ?? "0", 10) || 0;
  const urlSecurityFilter = (searchParams.get("security") as SecurityFilter) ?? "any";
  const urlTags = useMemo(
    () => searchParams.get("tags")?.split(",").filter(Boolean) ?? [],
    [searchParams]
  );

  // Local state
  const [query, setQuery] = useState(urlQuery);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [tourFinished, setTourFinished] = useState(false);
  const [mobileAdvisorDismissed, setMobileAdvisorDismissed] = useState(false);
  const [mobileAdvisorCopied, setMobileAdvisorCopied] = useState(false);
  const [displayCount, setDisplayCount] = useState(4000);
  const countAnimated = useRef(false);

  // Load view mode from localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem("skill-view-mode") as ViewMode | null;
    if (savedViewMode) setViewMode(savedViewMode);
  }, []);

  // Track page view (handles first visit, returning user, UTM params)
  useEffect(() => {
    trackPageView();
  }, []);

  // Save view mode to localStorage
  useEffect(() => {
    localStorage.setItem("skill-view-mode", viewMode);
  }, [viewMode]);

  // Reset pagination when filters change
  // Note: urlSecurityFilter excluded - it's a client-side filter that doesn't require data refetch
  const filterKey = `${urlCategory}-${urlSort}-${urlTags.join(",")}-${urlReviewerFilter}-${urlMinRating}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);

  if (filterKey !== lastFilterKey) {
    setCursor(0);
    setAllSkills([]);
    setLastFilterKey(filterKey);
  }

  // Convex queries
  const categoriesData = useQuery(api.clawdhubSync.getCategories, {});
  const tagsData = useQuery(api.clawdhubSync.getTags, {});
  const syncStatus = useQuery(api.clawdhubSync.getSyncStatus, {});

  // Animated skill count — starts at 4000, counts up to real value
  const targetCount = syncStatus?.totalCached ?? 0;
  useEffect(() => {
    if (targetCount <= 0 || countAnimated.current) return;
    countAnimated.current = true;
    const start = 4000;
    const end = targetCount;
    const duration = 1200;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayCount(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [targetCount]);

  const cachedResult = useQuery(api.clawdhubSync.listCachedSkillsWithFilters, {
    limit: 24,
    cursor,
    sortBy: urlSort,
    category: urlCategory === "all" ? undefined : urlCategory,
    tags: urlTags.length > 0 ? urlTags : undefined,
    minRating: urlMinRating > 0 ? urlMinRating : undefined,
    reviewerFilter: urlReviewerFilter !== "all" ? urlReviewerFilter : undefined,
  });

  const searchResult = useQuery(
    api.clawdhubSync.searchCachedSkills,
    query.trim() ? { 
      query: query.trim(), 
      limit: 50, 
      sortBy: urlSort,
      minRating: urlMinRating > 0 ? urlMinRating : undefined,
      reviewerFilter: urlReviewerFilter !== "all" ? urlReviewerFilter : undefined,
      category: urlCategory !== "all" ? urlCategory : undefined,
    } : "skip"
  );

  // Get skill IDs for vote fetching
  const skillIds = useMemo(() => {
    if (query.trim() && searchResult?.skills) {
      return searchResult.skills.map((s) => s._id as Id<"cachedSkills">);
    }
    return allSkills.map((s) => s._id as Id<"cachedSkills">);
  }, [allSkills, searchResult, query]);

  // Fetch user ratings for visible skills
  const userRatings = useQuery(
    api.reviews.getUserRatingsForSkills,
    userLoaded && user && skillIds.length > 0
      ? { cachedSkillIds: skillIds, clerkId: user.id }
      : "skip"
  );

  // Accumulate skills for infinite scroll
  useEffect(() => {
    if (!cachedResult?.skills) return;

    const newSkills: Skill[] = cachedResult.skills.map((s) => ({
      _id: s._id,
      slug: s.slug,
      name: s.name ?? s.slug,
      description: s.description,
      author: s.author ?? "unknown",
      downloads: s.downloads,
      stars: s.stars,
      installs: s.installs,
      category: s.category,
      normalizedTags: s.normalizedTags,
      isVerified: s.isVerified ?? false,
      clawdtmUpvotes: s.clawdtmUpvotes,
      clawdtmDownvotes: s.clawdtmDownvotes,
      reviewCount: s.reviewCount,
      humanReviewCount: s.humanReviewCount,
      botReviewCount: s.botReviewCount,
      avgRating: s.avgRating,
      avgRatingHuman: s.avgRatingHuman,
      avgRatingBot: s.avgRatingBot,
      // Security
      securityScore: s.securityScore,
      securityRisk: s.securityRisk,
      securityFlags: s.securityFlags,
      lastSecurityScanAt: s.lastSecurityScanAt,
    }));

    if (cursor === 0) {
      setAllSkills(newSkills);
    } else {
      setAllSkills((prev) => {
        const slugs = new Set(prev.map((s) => s.slug));
        const unique = newSkills.filter((s) => !slugs.has(s.slug));
        return [...prev, ...unique];
      });
    }
  }, [cachedResult, cursor]);

  // Determine which data to show
  const skills: Skill[] = useMemo(() => {
    let result: Skill[];
    
    if (query.trim() && searchResult?.skills) {
      result = searchResult.skills.map((s) => ({
        _id: s._id,
        slug: s.slug,
        name: s.name ?? s.slug,
        description: s.description,
        author: s.author ?? "unknown",
        downloads: s.downloads,
        stars: s.stars,
        installs: s.installs,
        isVerified: s.isVerified ?? false,
        clawdtmUpvotes: s.clawdtmUpvotes,
        clawdtmDownvotes: s.clawdtmDownvotes,
        reviewCount: s.reviewCount,
        humanReviewCount: s.humanReviewCount,
        botReviewCount: s.botReviewCount,
        avgRating: s.avgRating,
        avgRatingHuman: s.avgRatingHuman,
        avgRatingBot: s.avgRatingBot,
        // Security
        securityScore: s.securityScore,
        securityRisk: s.securityRisk,
        securityFlags: s.securityFlags,
        lastSecurityScanAt: s.lastSecurityScanAt,
      }));
    } else {
      result = allSkills;
    }
    
    // Apply security filter (client-side, score-based)
    if (urlSecurityFilter !== "any") {
      result = result.filter((s) => {
        switch (urlSecurityFilter) {
          case "low":
            return s.securityScore !== undefined && s.securityScore >= 70;
          case "medium":
            return s.securityScore !== undefined && s.securityScore >= 50;
          case "pending":
            // Show skills that haven't been scanned yet (no lastSecurityScanAt or no score)
            return s.lastSecurityScanAt === undefined || s.securityScore === undefined;
          default:
            return true;
        }
      });
    }
    
    return result;
  }, [allSkills, searchResult, query, urlSecurityFilter]);

  // Better loading detection - show loading only if we're actually waiting for initial data
  // If categories/tags loaded but skills haven't, we're connected - just waiting for skills
  const isConvexConnected = categoriesData !== undefined || tagsData !== undefined;
  const isLoading = 
    !query.trim() && 
    allSkills.length === 0 && 
    cachedResult === undefined && 
    isConvexConnected; // Only show loading if Convex is connected (categories/tags loaded)
  
  const isEmpty = skills.length === 0 && !isLoading && (cachedResult !== undefined || query.trim());
  const hasMore = cachedResult?.hasMore ?? false;
  const totalCount = cachedResult?.totalCount ?? 0;

  // URL update helper
  const updateURL = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Handlers
  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      updateURL({ q: newQuery || undefined });
      // Track search after results load
      if (newQuery.trim() && searchResult?.skills) {
        trackSearch(newQuery.trim(), searchResult.skills.length);
      }
    },
    [updateURL, searchResult]
  );

  const handleCategoryChange = useCallback(
    (newCategory: string) => {
      updateURL({ category: newCategory === "all" ? undefined : newCategory });
      trackCategoryFilter(newCategory);
    },
    [updateURL]
  );

  const handleSortChange = useCallback(
    (newSort: SortOption) => {
      updateURL({ sort: newSort });
      trackSortChange(newSort);
    },
    [updateURL]
  );

  const handleReviewerFilterChange = useCallback(
    (newFilter: ReviewerFilter) => {
      updateURL({ reviewer: newFilter === "all" ? undefined : newFilter });
    },
    [updateURL]
  );

  const handleMinRatingChange = useCallback(
    (newRating: number) => {
      updateURL({ minRating: newRating > 0 ? String(newRating) : undefined });
    },
    [updateURL]
  );

  const handleSecurityFilterChange = useCallback(
    (newFilter: SecurityFilter) => {
      updateURL({ security: newFilter !== "any" ? newFilter : undefined });
    },
    [updateURL]
  );

  const handleTagToggle = useCallback(
    (tag: string) => {
      const isAdding = !urlTags.includes(tag);
      const newTags = isAdding
        ? [...urlTags, tag]
        : urlTags.filter((t) => t !== tag);
      updateURL({ tags: newTags.length > 0 ? newTags.join(",") : undefined });
      trackTagFilter(tag, isAdding ? "add" : "remove");
    },
    [urlTags, updateURL]
  );

  const handleClearTags = useCallback(() => {
    updateURL({ tags: undefined });
  }, [updateURL]);

  const handleLoadMore = useCallback(() => {
    if (cachedResult?.nextCursor !== undefined) {
      setCursor(cachedResult.nextCursor);
      trackLoadMore(skills.length);
    }
  }, [cachedResult, skills.length]);

  const handleInstall = (skill: Skill) => {
    setSelectedSkill(skill);
    setInstallOpen(true);
    trackSkillInstall(skill.slug, skill.name);
  };

  const handleSearchFocus = () => {
    searchBarRef.current?.focus();
  };

  // Full-page initial loading state
  const initialLoading = syncStatus === undefined && cachedResult === undefined;

  if (initialLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center w-full">
        <div className="flex flex-col items-center gap-3">
          <Logo collapsed asSpan size={48} />
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex w-full overflow-x-hidden">
      {/* Onboarding Tour for first-time visitors */}
      <OnboardingTour onTourFinished={() => setTourFinished(true)} />
      
      {/* First-visit modal - shows after tour completes */}
      <FirstVisitModal tourFinished={tourFinished} />
      
      {/* Desktop Sidebar */}
      <Sidebar
        tags={tagsData?.tags ?? []}
        activeCategory={urlCategory}
        selectedTags={urlTags}
        onCategoryChange={handleCategoryChange}
        onTagToggle={handleTagToggle}
        onClearTags={handleClearTags}
        minRating={urlMinRating}
        onMinRatingChange={handleMinRatingChange}
        securityFilter={urlSecurityFilter}
        onSecurityFilterChange={handleSecurityFilterChange}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-dvh min-w-0">
        {/* Mobile header removed - logo integrated into headline */}

        <div className="flex-1 px-4 py-4 md:px-6 lg:px-8">
          {/* Page header */}
          <div className="mb-4">
            <h1 className="text-xl md:text-2xl font-bold mb-1">
              <span>
                <span className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                  {displayCount.toLocaleString()}+
                </span>{" "}
                vetted skills for your OpenClaw agent
              </span>
            </h1>
            <p className="text-muted-foreground text-sm hidden md:block">
              {(syncStatus?.totalHidden ?? 0) > 0 && (
                <span className="text-orange-500 dark:text-orange-400">
                  {syncStatus?.totalHidden} blocked for your protection
                </span>
              )}
              {syncStatus?.status === "running" && (
                <span className={`inline-flex items-center gap-1 ${(syncStatus?.totalHidden ?? 0) > 0 ? "ml-2" : ""}`}>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Syncing...
                </span>
              )}
            </p>
          </div>

          {/* Sticky Search Bar */}
          <SearchBar
            ref={searchBarRef}
            query={query}
            onQueryChange={handleQueryChange}
            activeSort={urlSort}
            onSortChange={handleSortChange}
            viewMode={viewMode}
            onViewModeChange={(mode) => {
              setViewMode(mode);
              trackViewModeChange(mode);
            }}
            reviewerFilter={urlReviewerFilter}
            onReviewerFilterChange={handleReviewerFilterChange}
            isSearching={query.trim().length > 0 && searchResult === undefined}
            resultCount={query.trim() ? skills.length : undefined}
          />

          {/* Mobile: Inline Advisor CTA */}
          {!mobileAdvisorDismissed && (
            <div className="md:hidden mt-4 rounded-lg border border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10 px-3 py-2.5 flex items-center gap-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">Skill Advisor</p>
                <p className="text-[11px] text-muted-foreground truncate">Give your agent access to {(syncStatus?.totalCached ?? 0).toLocaleString()}+ vetted skills.</p>
              </div>
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs gap-1 shrink-0 cursor-pointer"
                onClick={async () => {
                  if (typeof window === "undefined") return;
                  const instruction = `Read ${window.location.origin}/api/advisor/skill.md — learn this skill so you can help me search, evaluate, and install skills whenever I ask`;
                  await navigator.clipboard.writeText(instruction);
                  setMobileAdvisorCopied(true);
                  setTimeout(() => setMobileAdvisorCopied(false), 2000);
                }}
              >
                {mobileAdvisorCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {mobileAdvisorCopied ? "Copied" : "Copy"}
              </Button>
              <button
                onClick={() => setMobileAdvisorDismissed(true)}
                className="p-1.5 -mr-1 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Skills grid/list */}
          <div className="mt-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">Loading skills...</p>
              </div>
            ) : isEmpty ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  {syncStatus?.totalCached === 0
                    ? "No skills cached yet. Skills are syncing automatically."
                    : "No skills found. Try a different search."}
                </p>
              </div>
            ) : (
              <>
                <div
                  className={
                    viewMode === "card"
                      ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                      : "flex flex-col gap-3"
                  }
                >
                  {skills.map((skill, index) => (
                    <SkillCard
                      key={skill.slug}
                      skill={skill}
                      onInstall={handleInstall}
                      variant={viewMode}
                      userRating={userRatings?.[skill._id] ?? null}
                      isFirstCard={index === 0}
                      reviewerFilter={urlReviewerFilter}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-8 flex flex-col items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {skills.length}
                    {urlSecurityFilter !== "any" ? (
                      <span> matching skills (of {syncStatus?.totalCached ?? totalCount} total)</span>
                    ) : (
                      <span> of {syncStatus?.totalCached ?? totalCount} skills</span>
                    )}
                    <span className="mx-1.5">·</span>
                    <span className="text-muted-foreground/70">
                      Skill data from{" "}
                      <a 
                        href="https://www.clawhub.ai" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline hover:text-foreground transition-colors"
                      >
                        Clawhub
                      </a>
                    </span>
                  </p>
                  {hasMore && !query.trim() && (
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={cachedResult === undefined}
                    >
                      Load More
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer - hidden on mobile due to bottom nav */}
        <footer className="hidden md:block border-t border-border/40 py-4 px-4 md:px-6 mt-auto">
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <a
              href="https://github.com/0xmythril/clawdtm"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
              onClick={() => trackExternalLink("https://github.com/0xmythril/clawdtm", "footer_github")}
            >
              GitHub
            </a>
            <span className="text-border">•</span>
            <a
              href="https://www.clawhub.ai/0xmythril/clawdtm"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
              onClick={() => trackExternalLink("https://www.clawhub.ai/0xmythril/clawdtm", "footer_clawdtm_skill")}
            >
              ClawdTM Skill
            </a>
            <span className="text-border">•</span>
            <a
              href="https://docs.openclaw.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
              onClick={() => trackExternalLink("https://docs.openclaw.ai/", "footer_docs")}
            >
              OpenClaw Docs
            </a>
            <span className="text-border">•</span>
            <a
              href="https://x.com/0xmythril"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
              onClick={() => trackExternalLink("https://x.com/0xmythril", "footer_feedback")}
            >
              DM for Feedback
            </a>
          </div>
        </footer>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        tags={tagsData?.tags ?? []}
        selectedTags={urlTags}
        onTagToggle={handleTagToggle}
        onClearTags={handleClearTags}
        minRating={urlMinRating}
        onMinRatingChange={handleMinRatingChange}
        securityFilter={urlSecurityFilter}
        onSecurityFilterChange={handleSecurityFilterChange}
      />

      {/* Install modal */}
      <InstallModal
        open={installOpen}
        onOpenChange={setInstallOpen}
        skill={selectedSkill}
      />
    </div>
  );
}

// Main export - wraps content in Suspense for useSearchParams
export default function SkillsPage() {
  return (
    <Suspense fallback={<SkillsLoading />}>
      <SkillsContent />
    </Suspense>
  );
}
