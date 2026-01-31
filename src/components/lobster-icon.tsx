import { cn } from "@/lib/utils";

type LobsterIconProps = {
  className?: string;
  filled?: boolean;
};

// Custom lobster/claw icon for ClawdTM ratings
export function LobsterIcon({ className, filled = false }: LobsterIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4", className)}
    >
      {/* Claw/pincer shape - simplified lobster claw */}
      <path d="M4 8c0-2 1-4 4-4 2 0 3 1 4 3" />
      <path d="M20 8c0-2-1-4-4-4-2 0-3 1-4 3" />
      <path d="M8 4c-1-2-3-2-4 0" />
      <path d="M16 4c1-2 3-2 4 0" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 16v4" />
      <path d="M9 19l3 2 3-2" />
    </svg>
  );
}

// Simpler emoji-based rating display
export function LobsterEmoji({ className }: { className?: string }) {
  return <span className={cn("text-base", className)}>🦞</span>;
}
