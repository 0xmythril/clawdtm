"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type AdminGuardProps = {
  children: React.ReactNode;
  requireAdmin?: boolean; // If true, requires admin role; if false, moderator is enough
};

export function AdminGuard({ children, requireAdmin = false }: AdminGuardProps) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const router = useRouter();

  const roleData = useQuery(
    api.admin.getCurrentUserRole,
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Handle loading state
  if (!isUserLoaded || (user && roleData === undefined)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Handle not logged in
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Please sign in to access the admin panel.</p>
      </div>
    );
  }

  // Handle no role or insufficient permissions
  const hasAccess = requireAdmin ? roleData?.isAdmin : roleData?.isModerator;
  
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive font-medium">Access Denied</p>
        <p className="text-muted-foreground text-sm">
          You don&apos;t have permission to access this page.
          {requireAdmin ? " Admin role required." : " Moderator or admin role required."}
        </p>
        <button
          onClick={() => router.push("/")}
          className="text-primary hover:underline text-sm"
        >
          Return to home
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

export function useAdminRole() {
  const { user } = useUser();
  const roleData = useQuery(
    api.admin.getCurrentUserRole,
    user?.id ? { clerkId: user.id } : "skip"
  );

  return {
    clerkId: user?.id ?? null,
    isAdmin: roleData?.isAdmin ?? false,
    isModerator: roleData?.isModerator ?? false,
    role: roleData?.role ?? null,
    isLoading: user && roleData === undefined,
  };
}
