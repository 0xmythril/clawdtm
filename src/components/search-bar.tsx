"use client";

import { Search, X, LayoutGrid, List, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SORT_OPTIONS = [
  { value: "downloads", label: "Most Downloaded" },
  { value: "stars", label: "Most Starred" },
  { value: "installs", label: "Most Installed" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];
type ViewMode = "card" | "list";

type SearchBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  activeSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isSearching?: boolean;
  resultCount?: number;
  totalCount?: number;
};

export type SearchBarRef = {
  focus: () => void;
};

export const SearchBar = forwardRef<SearchBarRef, SearchBarProps>(
  function SearchBar(
    {
      query,
      onQueryChange,
      activeSort,
      onSortChange,
      viewMode,
      onViewModeChange,
      isSearching,
      resultCount,
      totalCount,
    },
    ref
  ) {
    const [localQuery, setLocalQuery] = useState(query);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    // Sync local query with prop
    useEffect(() => {
      setLocalQuery(query);
    }, [query]);

    // Debounced search
    useEffect(() => {
      const timer = setTimeout(() => {
        if (localQuery !== query) {
          onQueryChange(localQuery);
        }
      }, 300);

      return () => clearTimeout(timer);
    }, [localQuery, query, onQueryChange]);

    const handleClear = () => {
      setLocalQuery("");
      onQueryChange("");
      inputRef.current?.focus();
    };

    const activeSortLabel = SORT_OPTIONS.find((o) => o.value === activeSort)?.label;

    return (
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/40 -mx-4 px-4 py-3 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex gap-2 items-center">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search skills..."
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              className="pl-9 pr-9 h-10"
            />
            {localQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="shrink-0 gap-1.5 h-10">
                <span className="hidden sm:inline">{activeSortLabel}</span>
                <span className="sm:hidden">Sort</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onSortChange(option.value)}
                  className={activeSort === option.value ? "bg-accent" : ""}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View mode toggle */}
          <div className="hidden sm:flex border border-border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "card" ? "secondary" : "ghost"}
              size="icon"
              className="h-10 w-10 rounded-none border-0"
              onClick={() => onViewModeChange("card")}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="sr-only">Card view</span>
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-10 w-10 rounded-none border-0"
              onClick={() => onViewModeChange("list")}
            >
              <List className="h-4 w-4" />
              <span className="sr-only">List view</span>
            </Button>
          </div>
        </div>

        {/* Results count */}
        {(localQuery || isSearching) && (
          <p className="text-sm text-muted-foreground mt-2">
            {isSearching ? (
              "Searching..."
            ) : resultCount !== undefined ? (
              <>
                {resultCount} result{resultCount !== 1 ? "s" : ""} found
              </>
            ) : null}
          </p>
        )}
      </div>
    );
  }
);
