"use client";

import { useState, useEffect, useRef } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ChevronUp, ChevronDown, ArrowBigUp, ArrowBigDown } from "lucide-react";
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

  // Optimistic state - track pending vote only while request is in flight
  const [pendingVote, setPendingVote] = useState<"up" | "down" | null | undefined>(undefined);
  const [isVoting, setIsVoting] = useState(false);
  const lastUserVote = useRef(userVote);

  // Reset pending state when real data arrives from server
  useEffect(() => {
    if (userVote !== lastUserVote.current) {
      // Server data updated, clear any pending optimistic state
      setPendingVote(undefined);
      setIsVoting(false);
      lastUserVote.current = userVote;
    }
  }, [userVote]);

  // Use pending vote if we're in the middle of a request, otherwise use server truth
  const displayVote = pendingVote !== undefined ? pendingVote : userVote;
  
  // Calculate score based on server data, only adjust if we have a pending change
  let netScore = upvotes - downvotes;
  if (pendingVote !== undefined && pendingVote !== userVote) {
    // We have a pending change that differs from server state
    if (userVote === "up") netScore -= 1;
    if (userVote === "down") netScore += 1;
    if (pendingVote === "up") netScore += 1;
    if (pendingVote === "down") netScore -= 1;
  }

  const handleVote = async (voteType: "up" | "down") => {
    if (!user || !isLoaded) return;
    if (isVoting) return;

    setIsVoting(true);
    
    // Determine the new vote state
    const newVote = displayVote === voteType ? null : voteType;
    setPendingVote(newVote);

    try {
      if (newVote === null) {
        // Remove vote (clicking same button again)
        await removeVoteMutation({
          cachedSkillId: skillId,
          clerkId: user.id,
        });
      } else {
        // Add or change vote
        await voteMutation({
          cachedSkillId: skillId,
          clerkId: user.id,
          vote: newVote,
        });
      }
      // Note: we don't clear pendingVote here - the useEffect will do it
      // when the real userVote prop updates from the server
    } catch (error) {
      // Revert optimistic updates on error
      console.error("Vote failed:", error);
      setPendingVote(undefined);
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
          forceRedirectUrl={authRedirectUrl}
          signUpForceRedirectUrl={authRedirectUrl}
        >
          <Button
            variant="ghost"
            size="icon"
            className={cn(buttonSize, "cursor-pointer text-muted-foreground hover:text-green-500 hover:bg-green-500/10 transition-colors")}
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
          forceRedirectUrl={authRedirectUrl}
          signUpForceRedirectUrl={authRedirectUrl}
        >
          <Button
            variant="ghost"
            size="icon"
            className={cn(buttonSize, "cursor-pointer text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors")}
            title="Sign in to downvote"
          >
            <ChevronDown className={iconSize} />
          </Button>
        </SignInButton>
      </div>
    );
  }

  // Use filled arrows when voted for clearer visual feedback (like Reddit)
  const UpIcon = displayVote === "up" ? ArrowBigUp : ChevronUp;
  const DownIcon = displayVote === "down" ? ArrowBigDown : ChevronDown;

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
          "cursor-pointer transition-all duration-150",
          displayVote === "up"
            ? "text-green-500 bg-green-500/20 scale-110"
            : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
        )}
        onClick={() => handleVote("up")}
        disabled={isVoting}
        title={displayVote === "up" ? "Click to remove upvote" : "Upvote"}
      >
        <UpIcon className={cn(iconSize, displayVote === "up" && "fill-current")} />
      </Button>
      <span
        className={cn(
          scoreSize,
          "font-medium tabular-nums min-w-[1.5rem] text-center transition-colors",
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
          "cursor-pointer transition-all duration-150",
          displayVote === "down"
            ? "text-red-500 bg-red-500/20 scale-110"
            : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
        )}
        onClick={() => handleVote("down")}
        disabled={isVoting}
        title={displayVote === "down" ? "Click to remove downvote" : "Downvote"}
      >
        <DownIcon className={cn(iconSize, displayVote === "down" && "fill-current")} />
      </Button>
    </div>
  );
}
