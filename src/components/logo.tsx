"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

type LogoProps = {
  collapsed?: boolean;
  className?: string;
  size?: number;
  asSpan?: boolean; // Render as span instead of link (for inline use)
};

export function Logo({ collapsed = false, className = "", size = 32, asSpan = false }: LogoProps) {
  const [imgError, setImgError] = useState(false);

  const content = (
    <>
      {/* Logo Image with fallback */}
      {!imgError ? (
        <Image
          src="/logo.png"
          alt="ClawdTM"
          width={size}
          height={size}
          className="rounded-full flex-shrink-0"
          priority
          onError={() => setImgError(true)}
        />
      ) : (
        /* Fallback SVG if image fails to load */
        <div 
          className="rounded-full bg-red-500 flex items-center justify-center flex-shrink-0"
          style={{ width: size, height: size }}
        >
          <span style={{ fontSize: size * 0.6 }}>🦞</span>
        </div>
      )}

      {/* Text logo */}
      {!collapsed && (
        <div className="flex items-baseline flex-shrink-0">
          <span
            className="text-xl tracking-tight pr-0.5"
            style={{
              fontWeight: 800,
              fontStyle: "italic",
              background: "linear-gradient(135deg, #ef4444 0%, #f97316 50%, #eab308 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Clawd
          </span>
          <span
            className="text-[10px] font-bold text-muted-foreground"
            style={{
              verticalAlign: "super",
              lineHeight: 1,
            }}
          >
            TM
          </span>
        </div>
      )}
    </>
  );

  if (asSpan) {
    return (
      <span className={`flex items-center gap-2.5 font-bold select-none ${className}`}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href="/"
      className={`flex items-center gap-2.5 font-bold select-none ${className}`}
    >
      {content}
    </Link>
  );
}
