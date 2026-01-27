"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import {
  Sparkles,
  FileText,
  ExternalLink,
  Moon,
  Sun,
  Github,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Tag,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

type Category = { name: string; count: number };
type TagData = { tag: string; count: number };

type SidebarProps = {
  categories: Category[];
  tags: TagData[];
  activeCategory: string;
  selectedTags: string[];
  onCategoryChange: (category: string) => void;
  onTagToggle: (tag: string) => void;
  onClearTags: () => void;
};

export function Sidebar({
  categories,
  tags,
  activeCategory,
  selectedTags,
  onCategoryChange,
  onTagToggle,
  onClearTags,
}: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load collapsed state from localStorage
    const savedCategoriesOpen = localStorage.getItem("sidebar-categories-open");
    const savedTagsOpen = localStorage.getItem("sidebar-tags-open");
    if (savedCategoriesOpen !== null) setCategoriesOpen(savedCategoriesOpen === "true");
    if (savedTagsOpen !== null) setTagsOpen(savedTagsOpen === "true");
  }, []);

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

  const topTags = tags.slice(0, 15);

  return (
    <aside className="hidden md:flex md:w-60 lg:w-64 flex-col border-r border-border/40 bg-background h-screen sticky top-0">
      {/* Logo */}
      <div className="p-4 border-b border-border/40">
        <Logo />
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1 mb-6">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground"
          >
            <Sparkles className="h-4 w-4" />
            Skills
          </Link>
        </nav>

        {/* Categories Section */}
        <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
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
            <button
              onClick={() => onCategoryChange("all")}
              className={`flex items-center justify-between w-full px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <span>All</span>
            </button>
            <button
              onClick={() => onCategoryChange("featured")}
              className={`flex items-center justify-between w-full px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeCategory === "featured"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <span>⭐ Featured</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => onCategoryChange(cat.name)}
                className={`flex items-center justify-between w-full px-3 py-1.5 text-sm rounded-md transition-colors ${
                  activeCategory === cat.name
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <span className="capitalize truncate">
                  {cat.name.replace(/-/g, " ")}
                </span>
                <span className="text-xs opacity-60 ml-2">{cat.count}</span>
              </button>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Tags Section */}
        <Collapsible open={tagsOpen} onOpenChange={setTagsOpen} className="mt-4">
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
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
          <CollapsibleContent className="mt-2 px-3">
            <div className="flex flex-wrap gap-1.5">
              {topTags.map(({ tag, count }) => {
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
              })}
            </div>
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 px-2 text-xs w-full justify-start"
                onClick={onClearTags}
              >
                Clear selected tags
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* External Links */}
        <div className="mt-6 space-y-1">
          <a
            href="https://docs.clawd.bot/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors"
          >
            <FileText className="h-4 w-4" />
            Moltbot Docs
            <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
          </a>
          <a
            href="https://molthub.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Molthub
            <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
          </a>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border/40 space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start gap-2 h-9"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {mounted && theme === "dark" ? (
              <>
                <Sun className="h-4 w-4" />
                <span className="text-sm">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                <span className="text-sm">Dark Mode</span>
              </>
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
            <a
              href="https://github.com/0xmythril/clawdtm"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4" />
            </a>
          </Button>
        </div>

        {/* Made by credit */}
        <a
          href="https://x.com/0xmythril"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Made with</span>
          <span className="text-sm">🦞</span>
          <span>by</span>
          <span className="font-medium text-primary">0xMythril</span>
        </a>
      </div>
    </aside>
  );
}
