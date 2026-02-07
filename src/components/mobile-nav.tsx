"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import {
  SlidersHorizontal,
  Settings,
  X,
  Moon,
  Sun,
  Github,
  ExternalLink,
  Cpu,
  LogIn,
  Bot,
  BookOpen,
  Shield,
  ShieldCheck,
  ShieldQuestion,
  ChevronDown,
  ChevronRight,
  Info,
  MessageSquare,
  Compass,
} from "lucide-react";
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
import { AdvisorSkillModal } from "./advisor-skill-modal";
import Link from "next/link";
import type { SecurityFilter } from "./sidebar";

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

// Security filter options - same as sidebar
const SECURITY_OPTIONS = [
  { value: "low" as const, label: "Low Risk (70+)", icon: ShieldCheck, color: "text-green-600" },
  { value: "medium" as const, label: "Medium (50+)", icon: Shield, color: "text-yellow-500" },
  { value: "pending" as const, label: "Pending Scan", icon: ShieldQuestion, color: "text-gray-500" },
];

// Rating filter options - same as sidebar
const RATING_OPTIONS = [
  { value: 5, label: "5 🦞 only" },
  { value: 4, label: "4+ 🦞" },
  { value: 3, label: "3+ 🦞" },
  { value: 2, label: "2+ 🦞" },
];

type MobileNavProps = {
  tags: TagData[];
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  onClearTags: () => void;
  minRating?: number;
  onMinRatingChange?: (rating: number) => void;
  securityFilter?: SecurityFilter;
  onSecurityFilterChange?: (filter: SecurityFilter) => void;
};

export function MobileNav({
  tags,
  selectedTags,
  onTagToggle,
  onClearTags,
  minRating = 0,
  onMinRatingChange,
  securityFilter = "any",
  onSecurityFilterChange,
}: MobileNavProps) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const authRedirectUrl =
    typeof window !== "undefined" ? window.location.origin : "/";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [learnNavOpen, setLearnNavOpen] = useState(false);
  const [advisorSkillOpen, setAdvisorSkillOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(true);
  const [ratingsOpen, setRatingsOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);

  const topTags = tags.slice(0, 20);

  const isSkillsPage = !pathname || pathname === "/" || pathname === "";
  const isLearnPage = pathname?.startsWith("/learn") ?? false;

  const filterCount =
    (securityFilter !== "any" ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    selectedTags.length;
  const hasActiveFilters = filterCount > 0;

  const handleClearAll = () => {
    onSecurityFilterChange?.("any");
    onMinRatingChange?.(0);
    onClearTags();
  };

  return (
    <>
      {/* Fixed bottom navigation bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-bottom">
        <div className="flex items-center justify-around h-16 px-4">
          {/* Skills (Home) — uses logo instead of icon */}
          <Link
            href="/"
            data-tour="mobile-search"
            className={`flex flex-col items-center justify-center gap-0.5 transition-colors min-w-[72px] py-2 ${
              isSkillsPage ? "text-orange-500 dark:text-orange-400" : "text-muted-foreground active:text-foreground"
            }`}
          >
            <Logo collapsed asSpan size={26} />
            <span className="text-xs">Skills</span>
          </Link>

          {/* Learn */}
          <Link
            href="/learn"
            data-tour="mobile-advisor-skill"
            className={`flex flex-col items-center justify-center gap-1 transition-colors min-w-[72px] py-2 ${
              isLearnPage ? "text-blue-500 dark:text-blue-400" : "text-muted-foreground active:text-foreground"
            }`}
          >
            <BookOpen className="h-6 w-6" />
            <span className="text-xs">About</span>
          </Link>

          {/* Contextual: Filter on skills, Navigate on learn */}
          {isSkillsPage ? (
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <button
                data-tour="mobile-filters"
                className={`flex flex-col items-center justify-center gap-1 transition-colors relative min-w-[72px] py-2 cursor-pointer ${
                  filterCount > 0 ? "text-orange-500 dark:text-orange-400" : "text-orange-400/60 dark:text-orange-500/50 active:text-orange-500"
                }`}
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
                      onClick={handleClearAll}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear all
                    </Button>
                  )}
                </SheetTitle>
              </SheetHeader>

              {/* Scrollable filter sections */}
              <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-4 space-y-4">
                {/* Security Section */}
                {onSecurityFilterChange && (
                  <div>
                    <button
                      onClick={() => setSecurityOpen(!securityOpen)}
                      className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium uppercase tracking-wide bg-muted/70 dark:bg-muted/20 rounded-md text-foreground cursor-pointer"
                    >
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
                    {securityOpen && (
                      <div className="mt-2 space-y-1.5">
                        {SECURITY_OPTIONS.map((option) => {
                          const Icon = option.icon;
                          const isActive = securityFilter === option.value;
                          return (
                            <button
                              key={option.value}
                              onClick={() => onSecurityFilterChange(isActive ? "any" : option.value)}
                              className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm rounded-lg transition-colors cursor-pointer ${
                                isActive
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/60"
                              }`}
                            >
                              <Icon className={`h-4 w-4 ${isActive ? "" : option.color}`} />
                              <span>{option.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Ratings Section */}
                {onMinRatingChange && (
                  <div>
                    <button
                      onClick={() => setRatingsOpen(!ratingsOpen)}
                      className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium uppercase tracking-wide bg-muted/70 dark:bg-muted/20 rounded-md text-foreground cursor-pointer"
                    >
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
                    {ratingsOpen && (
                      <div className="mt-2 space-y-1.5">
                        {RATING_OPTIONS.map((option) => {
                          const isActive = minRating === option.value;
                          return (
                            <button
                              key={option.value}
                              onClick={() => onMinRatingChange(isActive ? 0 : option.value)}
                              className={`flex items-center w-full px-3 py-2.5 text-sm rounded-lg transition-colors cursor-pointer ${
                                isActive
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/60"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Tags Section */}
                <div>
                  <button
                    onClick={() => setTagsOpen(!tagsOpen)}
                    className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium uppercase tracking-wide bg-muted/70 dark:bg-muted/20 rounded-md text-foreground cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Cpu className="h-3.5 w-3.5" />
                      Tags
                      {selectedTags.length > 0 && (
                        <span className="text-[10px] normal-case font-normal text-muted-foreground/70">({selectedTags.length})</span>
                      )}
                    </span>
                    {tagsOpen ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {tagsOpen && (
                    <div className="mt-2 space-y-3">
                      {selectedTags.length > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {selectedTags.length} selected
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={onClearTags}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Clear
                          </Button>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2.5">
                        {topTags.map(({ tag, count }) => {
                          const isSelected = selectedTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              onClick={() => onTagToggle(tag)}
                              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
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
              </div>
            </SheetContent>
          </Sheet>
          ) : isLearnPage ? (
          <Sheet open={learnNavOpen} onOpenChange={setLearnNavOpen}>
            <SheetTrigger asChild>
              <button
                className="flex flex-col items-center justify-center gap-1 text-blue-400/60 dark:text-blue-500/50 active:text-blue-500 transition-colors min-w-[72px] py-2 cursor-pointer"
              >
                <Compass className="h-6 w-6" />
                <span className="text-xs">Navigate</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl px-0">
              <SheetHeader className="px-4 pb-3 border-b border-border/40">
                <SheetTitle className="text-base">About ClawdTM</SheetTitle>
              </SheetHeader>
              <nav className="p-4 space-y-1">
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
                      onClick={() => setLearnNavOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
          ) : (
            <div className="min-w-[72px]" />
          )}

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
                        <span className="flex-1 text-left">Sign In to Review</span>
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

                {/* Skill Advisor */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 text-sm"
                  onClick={() => {
                    setSettingsOpen(false);
                    setAdvisorSkillOpen(true);
                  }}
                >
                  <Bot className="h-5 w-5" />
                  <span className="flex-1 text-left">Skill Advisor</span>
                </Button>

                {/* Agent Reviews - subsection */}
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-10 text-sm text-muted-foreground"
                  asChild
                >
                  <a href="/api/review/skill.md" target="_blank" rel="noopener noreferrer">
                    <Bot className="h-4 w-4" />
                    <span className="flex-1 text-left">Agent review docs</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>

                {/* Theme toggle */}
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

      {/* Advisor Skill Modal */}
      <AdvisorSkillModal
        open={advisorSkillOpen}
        onOpenChange={setAdvisorSkillOpen}
      />
    </>
  );
}
