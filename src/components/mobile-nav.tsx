"use client";

import { useState } from "react";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Search, SlidersHorizontal, Settings, X, Moon, Sun, Github, ExternalLink, FolderOpen, Cpu, HelpCircle, LogIn, Bot } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTheme } from "next-themes";
import { Logo } from "./logo";
import { GettingStartedModal } from "./getting-started-modal";
import { AgentReviewsModal } from "./agent-reviews-modal";

// Tag color palette
const TAG_COLORS = [
  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

type TagData = { tag: string; count: number };

type MobileNavProps = {
  tags: TagData[];
  activeCategory: string;
  selectedTags: string[];
  onCategoryChange: (category: string) => void;
  onTagToggle: (tag: string) => void;
  onClearTags: () => void;
  onSearchFocus: () => void;
  minRating?: number;
  onMinRatingChange?: (rating: number) => void;
};

// Fixed categories - same as sidebar (Featured/Verified hidden until more content)
const FIXED_CATEGORIES = [
  { name: "all", label: "All", icon: null },
  { name: "latest", label: "Latest", icon: "🆕" },
];

// Rating filter options - same as sidebar
const RATING_OPTIONS = [
  { value: 0, label: "Any Rating", icon: null },
  { value: 5, label: "5 🦞 only", icon: "🦞🦞🦞🦞🦞" },
  { value: 4, label: "4+ 🦞", icon: "🦞🦞🦞🦞" },
  { value: 3, label: "3+ 🦞", icon: "🦞🦞🦞" },
  { value: 2, label: "2+ 🦞", icon: "🦞🦞" },
];

export function MobileNav({
  tags,
  activeCategory,
  selectedTags,
  onCategoryChange,
  onTagToggle,
  onClearTags,
  onSearchFocus,
  minRating = 0,
  onMinRatingChange,
}: MobileNavProps) {
  const { theme, setTheme } = useTheme();
  const authRedirectUrl =
    typeof window !== "undefined" ? window.location.origin : "/";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gettingStartedOpen, setGettingStartedOpen] = useState(false);
  const [agentReviewsOpen, setAgentReviewsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"categories" | "tags">("categories");

  const topTags = tags.slice(0, 20);
  const hasActiveFilters = activeCategory !== "all" || selectedTags.length > 0;
  const filterCount = (activeCategory !== "all" ? 1 : 0) + selectedTags.length;

  return (
    <>
      {/* Fixed bottom navigation bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-bottom">
        <div className="flex items-center justify-around h-16 px-4">
          {/* Search */}
          <button
            data-tour="mobile-search"
            className="flex flex-col items-center justify-center gap-1 text-muted-foreground active:text-foreground transition-colors min-w-[72px] py-2 cursor-pointer"
            onClick={onSearchFocus}
          >
            <Search className="h-6 w-6" />
            <span className="text-xs">Search</span>
          </button>

          {/* Filters */}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <button 
                data-tour="mobile-filters"
                className="flex flex-col items-center justify-center gap-1 text-muted-foreground active:text-foreground transition-colors relative min-w-[72px] py-2 cursor-pointer"
              >
                <SlidersHorizontal className="h-6 w-6" />
                <span className="text-xs">Filter</span>
                {filterCount > 0 && (
                  <span className="absolute top-1 right-3 h-5 w-5 bg-primary text-primary-foreground rounded-full text-[10px] font-medium flex items-center justify-center">
                    {filterCount}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl px-0">
              <SheetHeader className="px-4 pb-3 border-b border-border/40">
                <SheetTitle className="flex items-center justify-between text-base">
                  <span>Filters</span>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        onCategoryChange("all");
                        onClearTags();
                      }}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear all
                    </Button>
                  )}
                </SheetTitle>
              </SheetHeader>

              {/* Tab switcher */}
              <div className="flex border-b border-border/40">
                <button
                  onClick={() => setActiveTab("categories")}
                  className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === "categories"
                      ? "text-foreground border-b-2 border-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <FolderOpen className="h-4 w-4" />
                  Categories
                  {activeCategory !== "all" && (
                    <span className="h-2 w-2 bg-primary rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("tags")}
                  className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === "tags"
                      ? "text-foreground border-b-2 border-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <Cpu className="h-4 w-4" />
                  Tags
                  {selectedTags.length > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                      {selectedTags.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(80vh-130px)] p-4">
                {activeTab === "categories" && (
                  <div className="space-y-6">
                    {/* Categories */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          onCategoryChange("all");
                          setFiltersOpen(false);
                        }}
                        className={`p-4 rounded-xl text-sm font-medium transition-all text-left cursor-pointer ${
                          activeCategory === "all"
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted hover:bg-muted/80 text-foreground"
                        }`}
                      >
                        All Skills
                      </button>
                      {FIXED_CATEGORIES.filter(c => c.name !== "all").map((cat) => (
                        <button
                          key={cat.name}
                          onClick={() => {
                            onCategoryChange(cat.name);
                            setFiltersOpen(false);
                          }}
                          className={`p-4 rounded-xl text-sm font-medium transition-all text-left cursor-pointer ${
                            activeCategory === cat.name
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "bg-muted hover:bg-muted/80 text-foreground"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            {cat.icon && <span>{cat.icon}</span>}
                            <span className="capitalize">{cat.label}</span>
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Rating Filter */}
                    {onMinRatingChange && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <span>🦞</span>
                          Min Rating
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {RATING_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => {
                                onMinRatingChange(option.value);
                                setFiltersOpen(false);
                              }}
                              className={`p-3 rounded-lg text-sm font-medium transition-all text-left cursor-pointer ${
                                minRating === option.value
                                  ? "bg-orange-500 text-white shadow-md"
                                  : "bg-muted hover:bg-muted/80 text-foreground"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === "tags" && (
                  <div className="space-y-4">
                    {selectedTags.length > 0 && (
                      <div className="flex items-center justify-between pb-2 border-b border-border/40">
                        <span className="text-sm text-muted-foreground">
                          {selectedTags.length} selected
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={onClearTags}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                      {topTags.map(({ tag, count }) => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => onTagToggle(tag)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                              isSelected
                                ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md"
                                : ""
                            } ${getTagColor(tag)}`}
                          >
                            {tag}
                            <span className="ml-1.5 opacity-60">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Settings */}
          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetTrigger asChild>
              <button 
                data-tour="mobile-settings"
                className="flex flex-col items-center justify-center gap-1 text-muted-foreground active:text-foreground transition-colors min-w-[72px] py-2 cursor-pointer"
              >
                <Settings className="h-6 w-6" />
                <span className="text-xs">Settings</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl px-4">
              <SheetHeader className="pb-3 border-b border-border/40">
                <SheetTitle className="text-base">Settings</SheetTitle>
              </SheetHeader>

              <div className="space-y-3 pt-4 pb-8">
                {/* Logo */}
                <div className="flex justify-center pb-2">
                  <Logo />
                </div>

                {/* Auth section */}
                <div className="pb-2 border-b border-border/40">
                  <SignedOut>
                    <SignInButton
                      mode="modal"
                      forceRedirectUrl={authRedirectUrl}
                      signUpForceRedirectUrl={authRedirectUrl}
                    >
                      <Button
                        variant="default"
                        className="w-full justify-start gap-3 h-12 text-sm"
                      >
                        <LogIn className="h-5 w-5" />
                        <span className="flex-1 text-left">Sign In to Vote</span>
                      </Button>
                    </SignInButton>
                  </SignedOut>
                  <SignedIn>
                    <div className="flex items-center gap-3 px-3 py-2 bg-muted rounded-xl">
                      <UserButton 
                        afterSignOutUrl="/"
                        appearance={{
                          elements: {
                            avatarBox: "h-10 w-10",
                          },
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Signed in</p>
                        <p className="text-xs text-muted-foreground">Click avatar to manage</p>
                      </div>
                    </div>
                  </SignedIn>
                </div>

                {/* Getting Started */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 text-sm"
                  onClick={() => {
                    setSettingsOpen(false);
                    setGettingStartedOpen(true);
                  }}
                >
                  <HelpCircle className="h-5 w-5" />
                  <span className="flex-1 text-left">Getting Started</span>
                </Button>

                {/* Agent Reviews */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 text-sm"
                  onClick={() => {
                    setSettingsOpen(false);
                    setAgentReviewsOpen(true);
                  }}
                >
                  <Bot className="h-5 w-5" />
                  <span className="flex-1 text-left">Let your agent review!</span>
                </Button>

                {/* Theme toggle - not an external link */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 text-sm"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="h-5 w-5" />
                      <span className="flex-1 text-left">Switch to Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="h-5 w-5" />
                      <span className="flex-1 text-left">Switch to Dark Mode</span>
                    </>
                  )}
                </Button>

                <div className="pt-2 pb-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">External Links</p>
                </div>

                {/* GitHub link */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 text-sm"
                  asChild
                >
                  <a
                    href="https://github.com/0xmythril/clawdtm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="h-5 w-5" />
                    <span className="flex-1 text-left">View on GitHub</span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                </Button>

                {/* Discord Community link */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 text-sm"
                  asChild
                >
                  <a
                    href="https://discord.gg/eTtG4rhbp6"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <span className="flex-1 text-left">Join Community</span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                </Button>

                {/* OpenClaw Docs link */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 text-sm"
                  asChild
                >
                  <a
                    href="https://docs.openclaw.ai/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
                    </svg>
                    <span className="flex-1 text-left">OpenClaw Docs</span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                </Button>

                {/* Made by credit */}
                <div className="pt-4 text-center text-xs text-muted-foreground">
                  <a
                    href="https://x.com/0xmythril"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors inline-flex items-center gap-1"
                  >
                    Made with <span>🤖</span> by <span className="text-primary font-medium">0xMythril</span>
                    <ExternalLink className="h-3 w-3 ml-0.5" />
                  </a>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Bottom padding for content to not be hidden behind nav */}
      <div className="md:hidden h-16" />

      {/* Getting Started Modal */}
      <GettingStartedModal
        open={gettingStartedOpen}
        onOpenChange={setGettingStartedOpen}
      />

      {/* Agent Reviews Modal */}
      <AgentReviewsModal
        open={agentReviewsOpen}
        onOpenChange={setAgentReviewsOpen}
      />
    </>
  );
}
