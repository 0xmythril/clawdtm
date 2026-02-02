"use client";

import { AdminGuard, useAdminRole } from "@/components/admin/admin-guard";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Shield, Users, Bot, LayoutGrid, ArrowLeft } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin/skills", label: "Skills", icon: LayoutGrid, requireAdmin: false },
  { href: "/admin/users", label: "Users", icon: Users, requireAdmin: true },
  { href: "/admin/bots", label: "Bots", icon: Bot, requireAdmin: true },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isAdmin } = useAdminRole();

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-sm">Back to site</span>
                </Link>
                <span className="text-muted-foreground">/</span>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <h1 className="text-lg font-semibold">Admin Panel</h1>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="border-b bg-card/50">
          <div className="container mx-auto px-4">
            <div className="flex gap-1">
              {NAV_ITEMS.map((item) => {
                // Hide admin-only tabs if not admin
                if (item.requireAdmin && !isAdmin) return null;

                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-[1px]",
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Content */}
        <main className="container mx-auto px-4 py-6">
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}
