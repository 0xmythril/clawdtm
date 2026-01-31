"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

type QuickRatingProps = {
  skillId: Id<"cachedSkills">;
  avgRating: number | null;
  reviewCount: number;
  userRating?: number | null;
  size?: "sm" | "md";
};

export function QuickRating({
  skillId,
  avgRating,
  reviewCount,
  userRating,
  size = "sm",
}: QuickRatingProps) {
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [optimisticRating, setOptimisticRating] = useState<number | null>(null);

  const addReview = useMutation(api.reviews.addReview);

  const currentUserRating = optimisticRating ?? userRating ?? null;
  const displayRating = hoveredRating ?? currentUserRating ?? 0;
  const hasRating = reviewCount > 0;

  const sizeClasses = {
    sm: "text-base",
    md: "text-lg",
  };

  const containerPadding = {
    sm: "p-2",
    md: "p-3",
  };

  const handleRate = async (rating: number) => {
    if (!user?.id || isSubmitting) return;

    // Optimistic update
    setOptimisticRating(rating);
    setIsSubmitting(true);

    try {
      await addReview({
        cachedSkillId: skillId,
        clerkId: user.id,
        rating,
        reviewText: "", // Quick rating = no text
      });
    } catch (err) {
      // Revert optimistic update on error
      setOptimisticRating(null);
      console.error("Failed to rate:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClick = (e: React.MouseEvent, rating: number) => {
    e.preventDefault();
    e.stopPropagation();
    handleRate(rating);
  };

  return (
    <TooltipProvider>
      <div 
        className={cn(
          "flex flex-col items-center gap-1 rounded-lg border",
          containerPadding[size],
          hasRating 
            ? "border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30" 
            : "border-border bg-muted/30"
        )}
      >
        {/* Lobster rating row */}
        <div
          className="flex items-center gap-0.5"
          onMouseLeave={() => setHoveredRating(null)}
        >
          {[1, 2, 3, 4, 5].map((rating) => {
            const filled = rating <= displayRating;

            return (
              <Tooltip key={rating}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={!user || isSubmitting}
                    onClick={(e) => handleClick(e, rating)}
                    onMouseEnter={() => user && setHoveredRating(rating)}
                    className={cn(
                      "focus:outline-none transition-all leading-none",
                      sizeClasses[size],
                      user && !isSubmitting && "hover:scale-125 cursor-pointer",
                      !user && "cursor-default",
                      filled ? "opacity-100" : "opacity-40"
                    )}
                    style={filled ? {} : { filter: "grayscale(80%)" }}
                  >
                    🦞
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {!user
                    ? "Sign in to rate"
                    : isSubmitting
                      ? "Saving..."
                      : `Rate ${rating} lobster${rating > 1 ? "s" : ""}`}
                </TooltipContent>
              </Tooltip>
            );
          })}
          {isSubmitting && (
            <Loader2 className="h-4 w-4 ml-1 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Stats below */}
        <div className="text-xs text-center">
          {avgRating !== null ? (
            <span className="text-orange-600 dark:text-orange-400 font-semibold">{avgRating.toFixed(1)}</span>
          ) : (
            <span className="text-muted-foreground font-medium">No ratings</span>
          )}
          <span className="text-muted-foreground ml-1">({reviewCount})</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
