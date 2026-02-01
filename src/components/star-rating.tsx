"use client";

import { cn } from "@/lib/utils";

type RatingProps = {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
};

// Using lobster emoji to match ClawdTM branding
// Export as StarRating for backward compat but renders lobsters
export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onChange,
  className,
}: RatingProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-xl",
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
              "focus:outline-none transition-transform leading-none",
              sizeClasses[size],
              interactive && "hover:scale-125 cursor-pointer",
              !interactive && "cursor-default",
              filled ? "opacity-100" : "opacity-30 grayscale"
            )}
          >
            🦞
          </button>
        );
      })}
    </div>
  );
}
