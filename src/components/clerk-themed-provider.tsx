"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import { ReactNode, useEffect, useState } from "react";

export function ClerkThemedProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatch by not rendering Clerk-specific theming until mounted
  const baseTheme = mounted && resolvedTheme === "dark" ? dark : undefined;

  return (
    <ClerkProvider
      appearance={{
        baseTheme,
        variables: {
          colorPrimary: "#7c3aed",
          borderRadius: "0.5rem",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
