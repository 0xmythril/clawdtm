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
  Cpu,
  Search,
  X,
  LogIn,
  PanelLeftClose,
  PanelLeft,
  ShieldCheck,
  ShieldAlert,
  Shield,
  ShieldQuestion,
  BookOpen,
  Copy,
  Check,
  Bot,
  MessageSquare,
  Info,
  ExternalLink,
  Github,
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

// Rating filter options (click again to deselect)
const RATING_OPTIONS = [
  { value: 5, label: "5 🦞 only" },
  { value: 4, label: "4+ 🦞" },
  { value: 3, label: "3+ 🦞" },
  { value: 2, label: "2+ 🦞" },
];

// Security filter options (click again to deselect)
const SECURITY_OPTIONS = [
  { value: "low", label: "Low Risk (70+)", icon: ShieldCheck, color: "text-green-600" },
  { value: "medium", label: "Medium (50+)", icon: Shield, color: "text-yellow-500" },
  { value: "pending", label: "Pending Scan", icon: ShieldQuestion, color: "text-gray-500" },
] as const;

export type SecurityFilter = typeof SECURITY_OPTIONS[number]["value"] | "any";

type SidebarProps = {
  tags?: TagData[];
  activeCategory?: string;
  selectedTags?: string[];
  onCategoryChange?: (category: string) => void;
  onTagToggle?: (tag: string) => void;
  onClearTags?: () => void;
  minRating?: number;
  onMinRatingChange?: (rating: number) => void;
  securityFilter?: SecurityFilter;
  onSecurityFilterChange?: (filter: SecurityFilter) => void;
};

function getAdvisorInstruction() {
  if (typeof window === "undefined") return "";
  return `Read ${window.location.origin}/api/advisor/skill.md — learn this skill so you can help me search, evaluate, and install skills whenever I ask`;
}

export function Sidebar({
  tags = [],
  activeCategory = "all",
  selectedTags = [],
  onCategoryChange,
  onTagToggle,
  onClearTags,
  minRating = 0,
  onMinRatingChange,
  securityFilter = "any",
  onSecurityFilterChange,
}: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const authRedirectUrl =
    typeof window !== "undefined" ? window.location.origin : "/";
  const [collapsed, setCollapsed] = useState(false);
  const [ratingsOpen, setRatingsOpen] = useState(true);
  const [securityOpen, setSecurityOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [copiedAdvisor, setCopiedAdvisor] = useState(false);
  const [advisorInstruction, setAdvisorInstruction] = useState("");

  // Determine current page
  const isSkillsPage = pathname === "/" || pathname === "";
  const isLearnPage = pathname.startsWith("/learn");

  useEffect(() => {
    setMounted(true);
    setAdvisorInstruction(getAdvisorInstruction());
    // Load collapsed state from localStorage
    const savedCollapsed = localStorage.getItem("sidebar-collapsed");
    const savedTagsOpen = localStorage.getItem("sidebar-tags-open");
    if (savedCollapsed !== null) setCollapsed(savedCollapsed === "true");
    if (savedTagsOpen !== null) setTagsOpen(savedTagsOpen === "true");
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("sidebar-collapsed", String(collapsed));
    }
  }, [collapsed, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("sidebar-tags-open", String(tagsOpen));
    }
  }, [tagsOpen, mounted]);

  const copyAdvisorInstruction = async () => {
    const instruction = getAdvisorInstruction();
    await navigator.clipboard.writeText(instruction);
    setCopiedAdvisor(true);
    setTimeout(() => setCopiedAdvisor(false), 2000);
  };

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
        <div className={`p-3 border-b border-border/40 flex-shrink-0 flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`} data-tour="logo">
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
        <nav className="space-y-1 mb-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/"
                onClick={() => {
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
            {collapsed && <TooltipContent side="right">Skills</TooltipContent>}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/learn"
                onClick={() => {
                  if (collapsed) setCollapsed(false);
                }}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors relative ${
                  collapsed ? "justify-center" : ""
                } ${
                  isLearnPage
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                {isLearnPage && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                )}
                <BookOpen className="h-4 w-4 shrink-0" />
                {!collapsed && "About ClawdTM"}
              </Link>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">About ClawdTM</TooltipContent>}
          </Tooltip>
        </nav>

        {/* Install Skill Advisor - always visible, non-collapsible */}
        {!collapsed && (
          <div className="mb-4" data-tour="advisor-skill">
            <div className="px-3 mb-2">
              <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                Install Skill Advisor
              </span>
            </div>
            <div className="mx-2 rounded-lg bg-blue-500/10 border border-blue-500/20 p-2.5">
              <p className="text-xs text-muted-foreground leading-snug mb-2">
                Give your agent access to 5,000+ vetted skills.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs cursor-pointer gap-1.5"
                onClick={copyAdvisorInstruction}
              >
                {copiedAdvisor ? (
                  <>
                    <Check className="h-3 w-3 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy & send to your agent
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* About sub-nav - Only shown on About/Learn pages and when not collapsed */}
        {isLearnPage && !collapsed && (
          <div>
            <div className="px-3 mb-2">
              <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                About
              </span>
            </div>
            <nav className="space-y-0.5 px-2">
              {[
                { href: "/learn", label: "About ClawdTM", icon: Info, exact: true },
                { href: "/learn/filtering", label: "Our Filter Process", icon: Shield },
                { href: "/learn/advisor", label: "Skill Advisor", icon: Bot },
                { href: "/learn/reviews", label: "Agent Reviews", icon: MessageSquare },
                { href: "/learn/faq", label: "FAQ", icon: BookOpen },
                { href: "/learn/feedback", label: "Feedback & Report", icon: MessageSquare },
              ].map(({ href, label, icon: Icon, exact }) => {
                const isActive = exact ? pathname === href : pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      isActive
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {label}
                  </Link>
                );
              })}
              <a
                href="https://github.com/0xmythril/clawdtm"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors"
              >
                <Github className="h-3.5 w-3.5 shrink-0" />
                GitHub Repo
                <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
              </a>
            </nav>
          </div>
        )}

        {/* Skill Filters - Only shown on Skills page and when not collapsed */}
        {isSkillsPage && !collapsed && (
          <div data-tour="categories">
            {/* Section header */}
            <div className="px-3 mb-2">
              <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                Skill Filters
              </span>
            </div>

            {/* Security Section */}
            {onSecurityFilterChange && (
              <Collapsible open={securityOpen} onOpenChange={setSecurityOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors cursor-pointer bg-muted/70 dark:bg-muted/20 rounded-md text-foreground hover:bg-muted/90 dark:hover:bg-muted/30">
                    <span className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5" />
                      Security
                      {securityFilter !== "any" && (
                        <span className="text-[10px] normal-case font-normal text-muted-foreground/70">(filtered)</span>
                      )}
                    </span>
                    {securityOpen ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 mt-1">
                  <p className="text-[10px] text-muted-foreground/60 px-3 mb-1">
                    {securityFilter !== "any" ? "Click again to deselect" : "Click to select"}
                  </p>
                  {SECURITY_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isActive = securityFilter === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => onSecurityFilterChange?.(isActive ? "any" : option.value)}
                        className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        }`}
                      >
                        {Icon && <Icon className={`h-4 w-4 ${isActive ? "" : option.color}`} />}
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Rating Filter Section */}
            {onMinRatingChange && (
              <Collapsible open={ratingsOpen} onOpenChange={setRatingsOpen} className="mt-3">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors cursor-pointer bg-muted/70 dark:bg-muted/20 rounded-md text-foreground hover:bg-muted/90 dark:hover:bg-muted/30">
                    <span className="flex items-center gap-2">
                      <span className="text-sm">🦞</span>
                      Min Rating
                      {minRating > 0 && (
                        <span className="text-[10px] normal-case font-normal text-muted-foreground/70">(filtered)</span>
                      )}
                    </span>
                    {ratingsOpen ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 mt-1">
                  <p className="text-[10px] text-muted-foreground/60 px-3 mb-1">
                    {minRating > 0 ? "Click again to deselect" : "Click to select"}
                  </p>
                  {RATING_OPTIONS.map((option) => {
                    const isActive = minRating === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => onMinRatingChange?.(isActive ? 0 : option.value)}
                        className={`flex items-center justify-between w-full px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        }`}
                      >
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Tags Section */}
            <Collapsible open={tagsOpen} onOpenChange={setTagsOpen} className="mt-3">
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors cursor-pointer bg-muted/70 dark:bg-muted/20 rounded-md text-foreground hover:bg-muted/90 dark:hover:bg-muted/30">
                  <span className="flex items-center gap-2">
                    <Cpu className="h-3.5 w-3.5" />
                    Tags by AI
                    {selectedTags.length > 0 && (
                      <span className="text-[10px] normal-case font-normal text-muted-foreground">({selectedTags.length})</span>
                    )}
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
                            onClick={() => onTagToggle?.(tag)}
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
                      Showing top 50 of {tags.length} tags
                    </div>
                  )}
                </div>
                {selectedTags.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mx-3 mt-1 h-7 px-2 text-xs w-auto justify-start"
                    onClick={() => onClearTags?.()}
                  >
                    Clear selected tags
                  </Button>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        </div>
      </ScrollArea>

      {/* Footer */}
      <div className={`border-t border-border/40 space-y-2 flex-shrink-0 ${collapsed ? "p-2" : "p-3"}`}>

        {/* User section - at bottom */}
        <SignedOut>
          <div className={`flex items-center ${collapsed ? "flex-col gap-2" : "gap-2"}`} data-tour="signin">
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
                    {!collapsed && <span className="text-sm">Sign in to review</span>}
                  </Button>
                </SignInButton>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">Sign in to review</TooltipContent>}
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
            <span className="text-sm">🤖</span>
            <span>by</span>
            <span className="font-medium text-primary">0xMythril</span>
          </a>
        )}
      </div>
      </aside>
    </TooltipProvider>
  );
}
