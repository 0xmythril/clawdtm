"use client";

import { useState } from "react";
import { Sparkles, Search, SlidersHorizontal, Settings, X, Moon, Sun, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, FolderOpen, Cpu } from "lucide-react";
import { useTheme } from "next-themes";
import { Logo } from "./logo";

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

type Category = { name: string; count: number };
type TagData = { tag: string; count: number };

type MobileNavProps = {
  categories: Category[];
  tags: TagData[];
  activeCategory: string;
  selectedTags: string[];
  onCategoryChange: (category: string) => void;
  onTagToggle: (tag: string) => void;
  onClearTags: () => void;
  onSearchFocus: () => void;
};

export function MobileNav({
  categories,
  tags,
  activeCategory,
  selectedTags,
  onCategoryChange,
  onTagToggle,
  onClearTags,
  onSearchFocus,
}: MobileNavProps) {
  const { theme, setTheme } = useTheme();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  const [tagsExpanded, setTagsExpanded] = useState(true);

  const topTags = tags.slice(0, 15);
  const hasActiveFilters = activeCategory !== "all" || selectedTags.length > 0;

  return (
    <>
      {/* Fixed bottom navigation bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-bottom">
        <div className="flex items-center justify-around h-14 px-2">
          {/* Skills (Home) */}
          <button
            className="flex flex-col items-center justify-center gap-0.5 text-primary min-w-[60px] py-1"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-[10px] font-medium">Skills</span>
          </button>

          {/* Search */}
          <button
            className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground min-w-[60px] py-1"
            onClick={onSearchFocus}
          >
            <Search className="h-5 w-5" />
            <span className="text-[10px]">Search</span>
          </button>

          {/* Filters */}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground relative min-w-[60px] py-1">
                <SlidersHorizontal className="h-5 w-5" />
                <span className="text-[10px]">Filters</span>
                {hasActiveFilters && (
                  <span className="absolute top-0 right-2 h-2 w-2 bg-primary rounded-full" />
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[75vh] rounded-t-2xl px-4">
              <SheetHeader className="pb-3 border-b border-border/40">
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
                      Clear all
                    </Button>
                  )}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-4 overflow-y-auto max-h-[calc(75vh-80px)] pt-4 pb-8">
                {/* Categories */}
                <Collapsible open={categoriesExpanded} onOpenChange={setCategoriesExpanded}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-semibold">
                    <span className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      Categories
                    </span>
                    {categoriesExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => onCategoryChange("all")}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          activeCategory === "all"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80 text-foreground"
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => onCategoryChange("featured")}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          activeCategory === "featured"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80 text-foreground"
                        }`}
                      >
                        ⭐ Featured
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.name}
                          onClick={() => onCategoryChange(cat.name)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                            activeCategory === cat.name
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted hover:bg-muted/80 text-foreground"
                          }`}
                        >
                          <span className="capitalize">{cat.name.replace(/-/g, " ")}</span>
                          <span className="opacity-60">{cat.count}</span>
                        </button>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Tags */}
                <Collapsible open={tagsExpanded} onOpenChange={setTagsExpanded}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-semibold">
                    <span className="flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      Tags by AI
                    </span>
                    {tagsExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <div className="flex flex-wrap gap-2">
                      {topTags.map(({ tag, count }) => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => onTagToggle(tag)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                              isSelected
                                ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                                : ""
                            } ${getTagColor(tag)}`}
                          >
                            {tag}
                            <span className="ml-1 opacity-60">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedTags.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-3 h-8 text-xs"
                        onClick={onClearTags}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear tags
                      </Button>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </SheetContent>
          </Sheet>

          {/* Settings */}
          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground min-w-[60px] py-1">
                <Settings className="h-5 w-5" />
                <span className="text-[10px]">Settings</span>
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

                {/* Theme toggle */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-11 text-sm"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="h-4 w-4" />
                      <span>Switch to Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4" />
                      <span>Switch to Dark Mode</span>
                    </>
                  )}
                </Button>

                {/* GitHub link */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-11 text-sm"
                  asChild
                >
                  <a
                    href="https://github.com/0xmythril/clawdtm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="h-4 w-4" />
                    <span>View on GitHub</span>
                  </a>
                </Button>

                {/* Discord Community link */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-11 text-sm"
                  asChild
                >
                  <a
                    href="https://discord.gg/clawdbot"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <span>Join Community</span>
                  </a>
                </Button>

                {/* Molthub link */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-11 text-sm"
                  asChild
                >
                  <a
                    href="https://molthub.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Molthub</span>
                  </a>
                </Button>

                {/* Made by credit */}
                <div className="pt-3 text-center text-xs text-muted-foreground">
                  <a
                    href="https://x.com/0xmythril"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors flex items-center justify-center gap-1"
                  >
                    Made with <span>🦞</span> by <span className="text-primary font-medium">0xMythril</span>
                  </a>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Bottom padding for content to not be hidden behind nav */}
      <div className="md:hidden h-14" />
    </>
  );
}
