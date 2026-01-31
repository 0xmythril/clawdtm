"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

type RatingProps = {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
};

// Renamed from StarRating to avoid confusion with ClawdHub's star system
// Using hearts instead
export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onChange,
  className,
}: RatingProps) {
  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const handleClick = (index: number) => {
    if (interactive && onChange) {
      onChange(index + 1);
    }
  };

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: maxRating }).map((_, index) => {
        const filled = index < rating;
        return (
          <button
            key={index}
            type="button"
            disabled={!interactive}
            onClick={() => handleClick(index)}
            className={cn(
              "focus:outline-none transition-transform",
              interactive && "hover:scale-110 cursor-pointer",
              !interactive && "cursor-default"
            )}
          >
            <Heart
              className={cn(
                sizeClasses[size],
                filled
                  ? "text-rose-500 fill-rose-500"
                  : "text-muted-foreground/30"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
