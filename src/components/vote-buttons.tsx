"use client";

import { useState } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Id } from "../../convex/_generated/dataModel";

type VoteButtonsProps = {
  skillId: Id<"cachedSkills">;
  upvotes: number;
  downvotes: number;
  userVote: "up" | "down" | null;
  variant?: "vertical" | "horizontal";
  size?: "sm" | "md";
};

export function VoteButtons({
  skillId,
  upvotes,
  downvotes,
  userVote,
  variant = "vertical",
  size = "sm",
}: VoteButtonsProps) {
  const { user, isLoaded } = useUser();
  const authRedirectUrl =
    typeof window !== "undefined" ? window.location.origin : "/";
  const voteMutation = useMutation(api.voting.vote);
  const removeVoteMutation = useMutation(api.voting.removeVote);

  // Optimistic state
  const [optimisticVote, setOptimisticVote] = useState<"up" | "down" | null | undefined>(undefined);
  const [optimisticDelta, setOptimisticDelta] = useState({ up: 0, down: 0 });
  const [isVoting, setIsVoting] = useState(false);

  const currentVote = optimisticVote !== undefined ? optimisticVote : userVote;
  const netScore = upvotes - downvotes + optimisticDelta.up - optimisticDelta.down;

  const handleVote = async (voteType: "up" | "down") => {
    if (!user || !isLoaded) return;
    if (isVoting) return;

    setIsVoting(true);

    try {
      if (currentVote === voteType) {
        // Remove vote (clicking same button again)
        setOptimisticVote(null);
        setOptimisticDelta((prev) => ({
          up: voteType === "up" ? prev.up - 1 : prev.up,
          down: voteType === "down" ? prev.down - 1 : prev.down,
        }));

        await removeVoteMutation({
          cachedSkillId: skillId,
          clerkId: user.id,
        });
      } else {
        // Add or change vote
        const oldVote = currentVote;
        setOptimisticVote(voteType);
        setOptimisticDelta((prev) => ({
          up:
            prev.up +
            (voteType === "up" ? 1 : 0) -
            (oldVote === "up" ? 1 : 0),
          down:
            prev.down +
            (voteType === "down" ? 1 : 0) -
            (oldVote === "down" ? 1 : 0),
        }));

        await voteMutation({
          cachedSkillId: skillId,
          clerkId: user.id,
          vote: voteType,
        });
      }
    } catch (error) {
      // Revert optimistic updates on error
      console.error("Vote failed:", error);
      setOptimisticVote(undefined);
      setOptimisticDelta({ up: 0, down: 0 });
    } finally {
      setIsVoting(false);
    }
  };

  const buttonSize = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const scoreSize = size === "sm" ? "text-xs" : "text-sm";

  // If user is not signed in, wrap with SignInButton
  if (!isLoaded) {
    return (
      <div className={cn(
        "flex items-center gap-1",
        variant === "vertical" ? "flex-col" : "flex-row"
      )}>
        <Button
          variant="ghost"
          size="icon"
          className={cn(buttonSize, "text-muted-foreground")}
          disabled
        >
          <ChevronUp className={iconSize} />
        </Button>
        <span className={cn(scoreSize, "font-medium text-muted-foreground tabular-nums")}>
          {netScore}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className={cn(buttonSize, "text-muted-foreground")}
          disabled
        >
          <ChevronDown className={iconSize} />
        </Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={cn(
        "flex items-center gap-1",
        variant === "vertical" ? "flex-col" : "flex-row"
      )}>
        <SignInButton
          mode="modal"
          redirectUrl={authRedirectUrl}
          afterSignInUrl={authRedirectUrl}
          afterSignUpUrl={authRedirectUrl}
        >
          <Button
            variant="ghost"
            size="icon"
            className={cn(buttonSize, "text-muted-foreground hover:text-green-500")}
            title="Sign in to upvote"
          >
            <ChevronUp className={iconSize} />
          </Button>
        </SignInButton>
        <span className={cn(scoreSize, "font-medium text-muted-foreground tabular-nums")}>
          {netScore}
        </span>
        <SignInButton
          mode="modal"
          redirectUrl={authRedirectUrl}
          afterSignInUrl={authRedirectUrl}
          afterSignUpUrl={authRedirectUrl}
        >
          <Button
            variant="ghost"
            size="icon"
            className={cn(buttonSize, "text-muted-foreground hover:text-red-500")}
            title="Sign in to downvote"
          >
            <ChevronDown className={iconSize} />
          </Button>
        </SignInButton>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-1",
      variant === "vertical" ? "flex-col" : "flex-row"
    )}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          buttonSize,
          currentVote === "up"
            ? "text-green-500 bg-green-500/10"
            : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
        )}
        onClick={() => handleVote("up")}
        disabled={isVoting}
        title="Upvote"
      >
        <ChevronUp className={iconSize} />
      </Button>
      <span
        className={cn(
          scoreSize,
          "font-medium tabular-nums min-w-[1.5rem] text-center",
          netScore > 0 && "text-green-500",
          netScore < 0 && "text-red-500",
          netScore === 0 && "text-muted-foreground"
        )}
      >
        {netScore}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          buttonSize,
          currentVote === "down"
            ? "text-red-500 bg-red-500/10"
            : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
        )}
        onClick={() => handleVote("down")}
        disabled={isVoting}
        title="Downvote"
      >
        <ChevronDown className={iconSize} />
      </Button>
    </div>
  );
}
