"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAdminRole, AdminGuard } from "@/components/admin/admin-guard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Shield, ShieldCheck, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UserRole = "user" | "moderator" | "admin";

export default function AdminUsersPage() {
  return (
    <AdminGuard requireAdmin>
      <UsersContent />
    </AdminGuard>
  );
}

function UsersContent() {
  const { clerkId } = useAdminRole();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const usersData = useQuery(
    api.admin.listAllUsers,
    clerkId
      ? {
          clerkId,
          limit: pageSize,
          offset: page * pageSize,
        }
      : "skip"
  );

  const setUserRole = useMutation(api.admin.setUserRole);
  const [loadingUsers, setLoadingUsers] = useState<Record<string, boolean>>({});

  const handleRoleChange = async (targetClerkId: string, newRole: UserRole) => {
    if (!clerkId) return;
    setLoadingUsers((prev) => ({ ...prev, [targetClerkId]: true }));
    try {
      await setUserRole({ clerkId, targetClerkId, role: newRole });
    } catch (error) {
      console.error("Failed to update role:", error);
      alert(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setLoadingUsers((prev) => ({ ...prev, [targetClerkId]: false }));
    }
  };

  // Filter users by search
  const filteredUsers = usersData?.users.filter((u) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(searchLower) ||
      u.name?.toLowerCase().includes(searchLower) ||
      u.displayName?.toLowerCase().includes(searchLower) ||
      u.clerkId.toLowerCase().includes(searchLower)
    );
  });

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "admin":
        return <ShieldCheck className="h-4 w-4 text-primary" />;
      case "moderator":
        return <Shield className="h-4 w-4 text-orange-500" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-xl font-semibold">User Management</h2>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email, name, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      {usersData && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredUsers?.length ?? 0} of {usersData.total} users
        </p>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">User</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Clerk ID</th>
              <th className="text-center px-4 py-3 font-medium">Role</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredUsers?.map((user) => (
              <tr key={user._id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(user.role as UserRole)}
                    <span className="font-medium">
                      {user.displayName || user.name || "Unnamed"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {user.email || "—"}
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {user.clerkId.slice(0, 12)}...
                  </code>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    <span
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        user.role === "admin" && "bg-primary/10 text-primary",
                        user.role === "moderator" && "bg-orange-500/10 text-orange-600",
                        user.role === "user" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {user.role}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {loadingUsers[user.clerkId] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Select
                        value={user.role}
                        onValueChange={(value) =>
                          handleRoleChange(user.clerkId, value as UserRole)
                        }
                        disabled={user.clerkId === clerkId} // Can't change own role
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {usersData && usersData.total > pageSize && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {Math.ceil(usersData.total / pageSize)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!usersData.hasMore}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
