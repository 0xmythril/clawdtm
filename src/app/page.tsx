"use client";

import { Suspense, useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { SearchBar, type SearchBarRef } from "@/components/search-bar";
import { SkillCard, type Skill } from "@/components/skill-card";
import { InstallModal } from "@/components/install-modal";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { Logo } from "@/components/logo";

type SortOption = "downloads" | "stars" | "installs";
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

  // URL state
  const urlQuery = searchParams.get("q") ?? "";
  const urlCategory = searchParams.get("category") ?? "all";
  const urlSort = (searchParams.get("sort") as SortOption) ?? "downloads";
  const urlTags = searchParams.get("tags")?.split(",").filter(Boolean) ?? [];

  // Local state
  const [query, setQuery] = useState(urlQuery);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);

  // Load view mode from localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem("skill-view-mode") as ViewMode | null;
    if (savedViewMode) setViewMode(savedViewMode);
  }, []);

  // Save view mode to localStorage
  useEffect(() => {
    localStorage.setItem("skill-view-mode", viewMode);
  }, [viewMode]);

  // Reset pagination when filters change
  const filterKey = `${urlCategory}-${urlSort}-${urlTags.join(",")}`;
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

  const cachedResult = useQuery(api.clawdhubSync.listCachedSkillsWithFilters, {
    limit: 24,
    cursor,
    sortBy: urlSort,
    category: urlCategory === "all" ? undefined : urlCategory,
    tags: urlTags.length > 0 ? urlTags : undefined,
  });

  const searchResult = useQuery(
    api.clawdhubSync.searchCachedSkills,
    query.trim() ? { query: query.trim(), limit: 50, sortBy: urlSort } : "skip"
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
    if (query.trim() && searchResult?.skills) {
      return searchResult.skills.map((s) => ({
        _id: s._id,
        slug: s.slug,
        name: s.name ?? s.slug,
        description: s.description,
        author: s.author ?? "unknown",
        downloads: s.downloads,
        stars: s.stars,
        installs: s.installs,
      }));
    }
    return allSkills;
  }, [allSkills, searchResult, query]);

  const isLoading = cachedResult === undefined && !query.trim() && allSkills.length === 0;
  const isEmpty = skills.length === 0 && !isLoading;
  
  // Track loading state for sort/filter transitions
  const isTransitioning = 
    (query.trim() ? searchResult === undefined : cachedResult === undefined && allSkills.length === 0);
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
    },
    [updateURL]
  );

  const handleCategoryChange = useCallback(
    (newCategory: string) => {
      updateURL({ category: newCategory === "all" ? undefined : newCategory });
    },
    [updateURL]
  );

  const handleSortChange = useCallback(
    (newSort: SortOption) => {
      updateURL({ sort: newSort });
    },
    [updateURL]
  );

  const handleTagToggle = useCallback(
    (tag: string) => {
      const newTags = urlTags.includes(tag)
        ? urlTags.filter((t) => t !== tag)
        : [...urlTags, tag];
      updateURL({ tags: newTags.length > 0 ? newTags.join(",") : undefined });
    },
    [urlTags, updateURL]
  );

  const handleClearTags = useCallback(() => {
    updateURL({ tags: undefined });
  }, [updateURL]);

  const handleLoadMore = useCallback(() => {
    if (cachedResult?.nextCursor !== undefined) {
      setCursor(cachedResult.nextCursor);
    }
  }, [cachedResult]);

  const handleInstall = (skill: Skill) => {
    setSelectedSkill(skill);
    setInstallOpen(true);
  };

  const handleSearchFocus = () => {
    searchBarRef.current?.focus();
  };

  // Prepare categories for filter
  const categories = useMemo(() => {
    if (!categoriesData?.categories) return [];
    return categoriesData.categories
      .filter((c) => c && c !== "uncategorized")
      .map((name) => ({
        name,
        count: categoriesData.counts[name] ?? 0,
      }));
  }, [categoriesData]);

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <Sidebar
        categories={categories}
        tags={tagsData?.tags ?? []}
        activeCategory={urlCategory}
        selectedTags={urlTags}
        onCategoryChange={handleCategoryChange}
        onTagToggle={handleTagToggle}
        onClearTags={handleClearTags}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header removed - logo integrated into headline */}

        <div className="flex-1 px-4 py-4 md:px-6 lg:px-8">
          {/* Page header */}
          <div className="mb-4">
            <h1 className="text-xl md:text-2xl font-bold mb-1 flex flex-wrap items-center gap-x-2">
              {/* Mobile: Show logo inline */}
              <span className="md:hidden">
                <Logo collapsed asSpan size={28} />
              </span>
              <span className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                Superskill
              </span>{" "}
              <span>your <span className="line-through opacity-60">Clawdbot</span> Moltbot</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              {syncStatus?.totalCached ?? 0} community skills ready to install
              {syncStatus?.status === "running" && (
                <span className="ml-2 inline-flex items-center gap-1">
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
            onViewModeChange={setViewMode}
            isSearching={query.trim().length > 0 && searchResult === undefined}
            isLoading={isTransitioning}
            resultCount={query.trim() ? skills.length : undefined}
            totalCount={totalCount}
          />

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
                  {skills.map((skill) => (
                    <SkillCard
                      key={skill.slug}
                      skill={skill}
                      onInstall={handleInstall}
                      variant={viewMode}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-8 flex flex-col items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {skills.length} of {totalCount} skills
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
              href="https://discord.gg/clawdbot"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Join the Community
            </a>
            <span className="text-border">•</span>
            <a
              href="https://clawdhub.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Clawdhub
            </a>
          </div>
        </footer>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        categories={categories}
        tags={tagsData?.tags ?? []}
        activeCategory={urlCategory}
        selectedTags={urlTags}
        onCategoryChange={handleCategoryChange}
        onTagToggle={handleTagToggle}
        onClearTags={handleClearTags}
        onSearchFocus={handleSearchFocus}
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
