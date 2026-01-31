"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { StarRating } from "./star-rating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

type ReviewFormProps = {
  skillId: Id<"cachedSkills">;
  clerkId: string;
  existingReview?: {
    _id: Id<"skillReviews">;
    rating: number;
    reviewText: string;
  };
};

const MIN_LENGTH = 10;
const MAX_LENGTH = 1000;

export function ReviewForm({ skillId, clerkId, existingReview }: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [reviewText, setReviewText] = useState(existingReview?.reviewText ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const addReview = useMutation(api.reviews.addReview);
  const deleteReview = useMutation(api.reviews.deleteReview);

  const isEditing = !!existingReview;
  const charCount = reviewText.length;
  const isValid = rating >= 1 && rating <= 5 && charCount >= MIN_LENGTH && charCount <= MAX_LENGTH;

  // Reset form when existingReview changes
  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setReviewText(existingReview.reviewText);
    }
  }, [existingReview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isValid) {
      setError("Please provide a rating and review text (10-1000 characters)");
      return;
    }

    setIsSubmitting(true);
    try {
      await addReview({
        cachedSkillId: skillId,
        clerkId,
        rating,
        reviewText: reviewText.trim(),
      });
      setSuccess(isEditing ? "Review updated!" : "Review submitted!");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete your review?")) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      await deleteReview({
        cachedSkillId: skillId,
        clerkId,
      });
      // Reset form
      setRating(0);
      setReviewText("");
      setSuccess("Review deleted");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete review");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            {isEditing ? "Update your rating" : "Your rating"}
          </label>
          <StarRating
            rating={rating}
            interactive
            onChange={setRating}
            size="lg"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">
              {isEditing ? "Update your review" : "Your review"}
            </label>
            <span
              className={`text-xs ${
                charCount < MIN_LENGTH
                  ? "text-muted-foreground"
                  : charCount > MAX_LENGTH
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {charCount}/{MAX_LENGTH}
            </span>
          </div>
          <Textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience with this skill..."
            rows={4}
            maxLength={MAX_LENGTH + 100} // Allow slight overflow for better UX
            className="resize-none"
          />
          {charCount < MIN_LENGTH && charCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {MIN_LENGTH - charCount} more characters needed
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {success && (
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        )}

        <div className="flex items-center gap-2">
          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditing ? "Updating..." : "Submitting..."}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {isEditing ? "Update Review" : "Submit Review"}
              </>
            )}
          </Button>

          {isEditing && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={isDeleting}
              onClick={handleDelete}
              className="shrink-0"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
