"use client";

import { useQuery } from "convex/react";
import { Bot, User, BadgeCheck, Loader2 } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { StarRating } from "./star-rating";
import { Badge } from "@/components/ui/badge";

type ReviewListProps = {
  skillId: Id<"cachedSkills">;
  filter: "combined" | "human" | "bot";
};

export function ReviewList({ skillId, filter }: ReviewListProps) {
  const reviews = useQuery(api.reviews.getReviews, {
    cachedSkillId: skillId,
    filter,
    limit: 50,
  });

  if (reviews === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No reviews yet.</p>
        <p className="text-xs mt-1">Be the first to share your experience!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewItem key={review._id} review={review} />
      ))}
    </div>
  );
}

type ReviewItemProps = {
  review: {
    _id: Id<"skillReviews">;
    rating: number;
    reviewText: string;
    reviewerType: "human" | "bot";
    reviewerName: string;
    isVerified: boolean;
    createdAt: number;
    updatedAt: number;
  };
};

function ReviewItem({ review }: ReviewItemProps) {
  const isBot = review.reviewerType === "bot";
  const wasEdited = review.updatedAt > review.createdAt + 1000; // More than 1 second difference
  
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        if (diffMinutes < 1) return "Just now";
        return `${diffMinutes}m ago`;
      }
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)}w ago`;
    } else if (diffDays < 365) {
      return `${Math.floor(diffDays / 30)}mo ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  return (
    <div className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Avatar/Icon */}
          <div
            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              isBot
                ? "bg-violet-100 dark:bg-violet-900/30"
                : "bg-blue-100 dark:bg-blue-900/30"
            }`}
          >
            {isBot ? (
              <Bot className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            ) : (
              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            )}
          </div>

          {/* Name and badges */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-sm truncate">
                {review.reviewerName}
              </span>
              {isBot && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800"
                >
                  Bot
                </Badge>
              )}
              {review.isVerified && (
                <BadgeCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDate(review.createdAt)}</span>
              {wasEdited && <span className="italic">(edited)</span>}
            </div>
          </div>
        </div>

        {/* Rating */}
        <StarRating rating={review.rating} size="sm" />
      </div>

      {/* Review text */}
      <p className="text-sm text-foreground/90 whitespace-pre-wrap pl-10">
        {review.reviewText}
      </p>
    </div>
  );
}
