"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Send, Trash2, Pencil, User, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { StarRating } from "./star-rating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ReviewFormProps = {
  skillId: Id<"cachedSkills">;
  clerkId: string;
  existingReview?: {
    _id: Id<"skillReviews">;
    rating: number;
    reviewText: string;
  };
};

const MAX_LENGTH = 1000;

export function ReviewForm({ skillId, clerkId, existingReview }: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [reviewText, setReviewText] = useState(existingReview?.reviewText ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const addReview = useMutation(api.reviews.addReview);
  const deleteReview = useMutation(api.reviews.deleteReview);
  const setDisplayName = useMutation(api.users.setDisplayName);
  const userDisplayName = useQuery(api.users.getDisplayName, { clerkId });

  const isEditing = !!existingReview;
  const charCount = reviewText.trim().length;
  const hasRating = rating >= 1 && rating <= 5;
  const hasText = charCount > 0;
  const isValidLength = charCount <= MAX_LENGTH;

  // Check if content has changed from original
  const hasChanges = isEditing 
    ? (rating !== existingReview.rating || reviewText.trim() !== existingReview.reviewText)
    : (hasRating || hasText);

  // Reset form when existingReview changes
  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setReviewText(existingReview.reviewText);
    }
  }, [existingReview]);

  // Pre-fill display name input with existing name if available
  useEffect(() => {
    if (userDisplayName?.displayName) {
      setDisplayNameInput(userDisplayName.displayName);
    } else if (userDisplayName?.name) {
      setDisplayNameInput(userDisplayName.name);
    }
  }, [userDisplayName]);

  const submitReview = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await addReview({
        cachedSkillId: skillId,
        clerkId,
        rating,
        reviewText: reviewText.trim(),
      });
      setSuccess(isEditing ? "Review updated!" : "Review submitted!");
      setTimeout(() => setSuccess(null), 3000);
      // Collapse after successful update
      if (isEditing) {
        setIsExpanded(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setIsSubmitting(false);
      setShowConfirmModal(false);
      setPendingSubmit(false);
    }
  };

  const handleDisplayNameSubmit = async () => {
    const trimmed = displayNameInput.trim();
    if (trimmed.length < 2) {
      setError("Display name must be at least 2 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      await setDisplayName({ clerkId, displayName: trimmed });
      setShowNameModal(false);
      // Now continue with the review submission
      if (pendingSubmit) {
        if (!hasText) {
          setShowConfirmModal(true);
        } else {
          await submitReview();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save display name");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!hasRating) {
      setError("Please select a rating");
      return;
    }

    if (!isValidLength) {
      setError(`Review text must be ${MAX_LENGTH} characters or less`);
      return;
    }

    // If user doesn't have a display name yet and this is their first review
    if (!isEditing && !userDisplayName?.hasDisplayName) {
      setPendingSubmit(true);
      setShowNameModal(true);
      return;
    }

    // If no text, show confirmation modal
    if (!hasText) {
      setShowConfirmModal(true);
      return;
    }

    // Otherwise submit directly
    await submitReview();
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

  // Render collapsible for existing reviews
  if (isEditing) {
    return (
      <>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
            {/* Collapsed header - always visible */}
            <CollapsibleTrigger asChild>
              <button className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-orange-100/50 dark:hover:bg-orange-900/20 transition-colors rounded-t-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-lg">🦞</span>
                    <span className="font-semibold text-orange-700 dark:text-orange-300">
                      {existingReview.rating}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                      Your review
                    </p>
                    {existingReview.reviewText && (
                      <p className="text-xs text-muted-foreground truncate">
                        {existingReview.reviewText}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400">
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>
            </CollapsibleTrigger>

            {/* Expanded content */}
            <CollapsibleContent>
              <div className="px-4 pb-4 pt-0 border-t border-orange-200 dark:border-orange-800">
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Update your rating
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
                        Update your review{" "}
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <span
                        className={`text-xs ${
                          charCount > MAX_LENGTH ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {charCount}/{MAX_LENGTH}
                      </span>
                    </div>
                    <Textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Share your experience with this skill..."
                      rows={3}
                      maxLength={MAX_LENGTH + 100}
                      className="resize-none"
                    />
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
                      disabled={!hasRating || !isValidLength || isSubmitting || !hasChanges}
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Pencil className="h-4 w-4 mr-2" />
                          Update Review
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={isDeleting}
                      onClick={handleDelete}
                      className="shrink-0 border-destructive/50 hover:bg-destructive/10"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>

                  {!hasChanges && (
                    <p className="text-xs text-muted-foreground text-center">
                      Make changes to update your review
                    </p>
                  )}
                </form>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Confirmation modal for rating-only reviews */}
        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-xl">🦞</span>
                Submit rating only?
              </DialogTitle>
              <DialogDescription>
                You&apos;re about to submit a {rating}-lobster rating without any written review.
                Adding a few words about your experience helps others make better decisions!
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                className="w-full sm:w-auto"
              >
                Add a review
              </Button>
              <Button
                onClick={submitReview}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit rating only"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // New review form (not collapsible)
  return (
    <>
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Your rating
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
                Your review{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <span
                className={`text-xs ${
                  charCount > MAX_LENGTH ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {charCount}/{MAX_LENGTH}
              </span>
            </div>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience with this skill... (optional but appreciated!)"
              rows={3}
              maxLength={MAX_LENGTH + 100}
              className="resize-none"
            />
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
              disabled={!hasRating || !isValidLength || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Review
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Display name prompt modal */}
      <Dialog open={showNameModal} onOpenChange={setShowNameModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Choose your display name
            </DialogTitle>
            <DialogDescription>
              This name will be shown publicly with your review. You can change it anytime.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              placeholder="Your name"
              maxLength={50}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              2-50 characters. Letters, numbers, spaces, and basic punctuation allowed.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowNameModal(false);
                setPendingSubmit(false);
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDisplayNameSubmit}
              disabled={isSubmitting || displayNameInput.trim().length < 2}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation modal for rating-only reviews */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">🦞</span>
              Submit rating only?
            </DialogTitle>
            <DialogDescription>
              You&apos;re about to submit a {rating}-lobster rating without any written review.
              Adding a few words about your experience helps others make better decisions!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              className="w-full sm:w-auto"
            >
              Add a review
            </Button>
            <Button
              onClick={submitReview}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit rating only"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
