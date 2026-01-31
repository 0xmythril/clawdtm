"use client";

import { useTheme } from "next-themes";
import { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import {
  Sparkles,
  Moon,
  Sun,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Cpu,
  HelpCircle,
  Search,
  X,
  LogIn,
  PanelLeftClose,
  PanelLeft,
  Bot,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Logo } from "./logo";
import { GettingStartedModal } from "./getting-started-modal";
import { AgentReviewsModal } from "./agent-reviews-modal";
import Link from "next/link";

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

// Rating filter options
const RATING_OPTIONS = [
  { value: 0, label: "Any Rating", icon: null },
  { value: 5, label: "5 🦞 only", icon: "🦞🦞🦞🦞🦞" },
  { value: 4, label: "4+ 🦞", icon: "🦞🦞🦞🦞" },
  { value: 3, label: "3+ 🦞", icon: "🦞🦞🦞" },
  { value: 2, label: "2+ 🦞", icon: "🦞🦞" },
];

type SidebarProps = {
  tags: TagData[];
  activeCategory: string;
  selectedTags: string[];
  onCategoryChange: (category: string) => void;
  onTagToggle: (tag: string) => void;
  onClearTags: () => void;
  minRating?: number;
  onMinRatingChange?: (rating: number) => void;
};

export function Sidebar({
  tags,
  activeCategory,
  selectedTags,
  onCategoryChange,
  onTagToggle,
  onClearTags,
  minRating = 0,
  onMinRatingChange,
}: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const authRedirectUrl =
    typeof window !== "undefined" ? window.location.origin : "/";
  const [collapsed, setCollapsed] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [ratingsOpen, setRatingsOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  // Determine current page
  const isSkillsPage = pathname === "/" || pathname === "";

  useEffect(() => {
    setMounted(true);
    // Load collapsed state from localStorage
    const savedCollapsed = localStorage.getItem("sidebar-collapsed");
    const savedCategoriesOpen = localStorage.getItem("sidebar-categories-open");
    const savedTagsOpen = localStorage.getItem("sidebar-tags-open");
    if (savedCollapsed !== null) setCollapsed(savedCollapsed === "true");
    if (savedCategoriesOpen !== null) setCategoriesOpen(savedCategoriesOpen === "true");
    if (savedTagsOpen !== null) setTagsOpen(savedTagsOpen === "true");
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("sidebar-collapsed", String(collapsed));
    }
  }, [collapsed, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("sidebar-categories-open", String(categoriesOpen));
    }
  }, [categoriesOpen, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("sidebar-tags-open", String(tagsOpen));
    }
  }, [tagsOpen, mounted]);

  // Fixed categories - no search needed (Featured/Verified hidden until more content)
  const fixedCategories = [
    { name: "all", label: "All", icon: null },
    { name: "latest", label: "Latest", icon: "🆕" },
  ];

  // Filter and limit tags
  const filteredTags = useMemo(() => {
    let filtered = tags;
    if (tagSearch.trim()) {
      const searchLower = tagSearch.toLowerCase();
      filtered = tags.filter((tag) =>
        tag.tag.toLowerCase().includes(searchLower)
      );
    }
    return filtered.slice(0, 50); // Max 50 tags (increased from 15)
  }, [tags, tagSearch]);

  return (
    <TooltipProvider delayDuration={0}>
      <aside 
        className={`hidden md:flex flex-col border-r border-border/40 bg-background h-screen sticky top-0 overflow-hidden transition-all duration-300 ${
          collapsed ? "w-16" : "md:w-60 lg:w-64"
        }`}
      >
        {/* Logo & Collapse Toggle */}
        <div className={`p-3 border-b border-border/40 flex-shrink-0 flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`}>
          {!collapsed && <Logo />}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

      {/* Navigation - scrollable area */}
      <ScrollArea className="flex-1 min-h-0">
        <div className={`py-4 ${collapsed ? "px-2" : "px-3"}`}>
        <nav className="space-y-1 mb-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/"
                onClick={() => {
                  // Expand sidebar when clicking Skills while collapsed
                  if (collapsed) setCollapsed(false);
                }}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors relative ${
                  collapsed ? "justify-center" : ""
                } ${
                  isSkillsPage
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                {isSkillsPage && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                )}
                <Sparkles className="h-4 w-4 shrink-0" />
                {!collapsed && "Skills"}
              </Link>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Skills (click to expand)</TooltipContent>}
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <GettingStartedModal
                trigger={
                  <button className={`flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors w-full cursor-pointer ${
                    collapsed ? "justify-center" : ""
                  }`}>
                    <HelpCircle className="h-4 w-4 shrink-0" />
                    {!collapsed && "Getting Started"}
                  </button>
                }
              />
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Getting Started</TooltipContent>}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <AgentReviewsModal
                trigger={
                  <button className={`flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors w-full cursor-pointer ${
                    collapsed ? "justify-center" : ""
                  }`}>
                    <Bot className="h-4 w-4 shrink-0" />
                    {!collapsed && "Let your agent vote!"}
                  </button>
                }
              />
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Let your agent vote!</TooltipContent>}
          </Tooltip>
        </nav>

        {/* Skill Filters - Only shown on Skills page and when not collapsed */}
        {isSkillsPage && !collapsed && (
          <>
            {/* Section header */}
            <div className="px-3 mb-2">
              <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                Skill Filters
              </span>
            </div>

            {/* Categories Section */}
            <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer">
                  <span className="flex items-center gap-2">
                    <FolderOpen className="h-3.5 w-3.5" />
                    Categories
                  </span>
                  {categoriesOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 mt-1">
                {fixedCategories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => onCategoryChange(cat.name)}
                    className={`flex items-center justify-between w-full px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${
                      activeCategory === cat.name
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {cat.icon && <span>{cat.icon}</span>}
                      <span className="capitalize">{cat.label}</span>
                    </span>
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Rating Filter Section */}
            {onMinRatingChange && (
              <Collapsible open={ratingsOpen} onOpenChange={setRatingsOpen} className="mt-4">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="text-sm">🦞</span>
                      Min Rating
                    </span>
                    {ratingsOpen ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 mt-1">
                  {RATING_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => onMinRatingChange(option.value)}
                      className={`flex items-center justify-between w-full px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${
                        minRating === option.value
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      }`}
                    >
                      <span>{option.label}</span>
                    </button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Tags Section */}
            <Collapsible open={tagsOpen} onOpenChange={setTagsOpen} className="mt-4">
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Cpu className="h-3.5 w-3.5" />
                    Tags by AI
                  </span>
                  {tagsOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {/* Tag Search */}
                <div className="px-3 relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search tags..."
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    className="h-7 pl-8 pr-7 text-xs bg-background"
                  />
                  {tagSearch && (
                    <button
                      onClick={() => setTagSearch("")}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="px-3">
                  <div className="flex flex-wrap gap-1.5">
                    {filteredTags.length > 0 ? (
                      filteredTags.map(({ tag, count }) => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <Badge
                            key={tag}
                            variant="outline"
                            className={`cursor-pointer transition-all text-xs px-2 py-0.5 border-0 ${
                              isSelected
                                ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                                : "hover:ring-1 hover:ring-primary/50"
                            } ${getTagColor(tag)}`}
                            onClick={() => onTagToggle(tag)}
                          >
                            {tag}
                            <span className="ml-1 opacity-60">{count}</span>
                          </Badge>
                        );
                      })
                    ) : tagSearch ? (
                      <div className="w-full py-2 text-xs text-muted-foreground text-center">
                        No tags found
                      </div>
                    ) : null}
                  </div>
                  {tags.length > 50 && !tagSearch && (
                    <div className="mt-2 text-xs text-muted-foreground text-center">
                      Showing top 50 of {tags.length}
                    </div>
                  )}
                </div>
                {selectedTags.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mx-3 mt-1 h-7 px-2 text-xs w-auto justify-start"
                    onClick={onClearTags}
                  >
                    Clear selected tags
                  </Button>
                )}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        </div>
      </ScrollArea>

      {/* Footer */}
      <div className={`border-t border-border/40 space-y-2 flex-shrink-0 ${collapsed ? "p-2" : "p-3"}`}>

        {/* User section - at bottom */}
        <SignedOut>
          <div className={`flex items-center ${collapsed ? "flex-col gap-2" : "gap-2"}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <SignInButton
                  mode="modal"
                  forceRedirectUrl={authRedirectUrl}
                  signUpForceRedirectUrl={authRedirectUrl}
                >
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`h-9 ${collapsed ? "w-full justify-center px-0" : "flex-1 justify-start gap-2"}`}
                  >
                    <LogIn className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="text-sm">Sign In</span>}
                  </Button>
                </SignInButton>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">Sign In</TooltipContent>}
            </Tooltip>
            {/* Theme toggle for signed out */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {mounted && theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </TooltipContent>
            </Tooltip>
          </div>
        </SignedOut>

        <SignedIn>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8",
                  },
                }}
              />
              {/* Theme toggle when collapsed */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  >
                    {mounted && theme === "dark" ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div 
              className="flex items-center gap-2 px-2 py-2 rounded-md bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors cursor-pointer"
              onClick={(e) => {
                // Don't trigger if clicking the theme button
                if ((e.target as HTMLElement).closest('[data-theme-toggle]')) return;
                // Find and click the Clerk UserButton to toggle its dropdown
                const userButtonTrigger = e.currentTarget.querySelector('[data-clerk-component] button, .cl-userButtonTrigger, .cl-avatarBox');
                if (userButtonTrigger) {
                  (userButtonTrigger as HTMLElement).click();
                }
              }}
            >
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "h-7 w-7",
                  },
                }}
              />
              <span className="text-sm text-foreground flex-1">
                Account
              </span>
              {/* Theme toggle in account row */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    data-theme-toggle
                    onClick={(e) => {
                      e.stopPropagation();
                      setTheme(theme === "dark" ? "light" : "dark");
                    }}
                  >
                    {mounted && theme === "dark" ? (
                      <Sun className="h-3.5 w-3.5" />
                    ) : (
                      <Moon className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </SignedIn>

        {/* Made by credit - hidden when collapsed */}
        {!collapsed && (
          <a
            href="https://x.com/0xmythril"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
          >
            <span>Made with</span>
            <span className="text-sm">🦞</span>
            <span>by</span>
            <span className="font-medium text-primary">0xMythril</span>
          </a>
        )}
      </div>
      </aside>
    </TooltipProvider>
  );
}
