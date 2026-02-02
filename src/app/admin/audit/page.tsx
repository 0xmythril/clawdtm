"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAdminRole } from "@/components/admin/admin-guard";
import { Button } from "@/components/ui/button";
import {
  Eye,
  EyeOff,
  Star,
  BadgeCheck,
  Users,
  Bot,
  Loader2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ActionFilter = "all" | "hide_skill" | "unhide_skill" | "set_featured" | "set_verified" | "set_user_role" | "set_bot_role" | "create_bot" | "revoke_bot";
type TargetTypeFilter = "all" | "skill" | "user" | "bot";

const ACTION_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  hide_skill: { label: "Hide Skill", icon: <EyeOff className="h-4 w-4" />, color: "text-red-500" },
  unhide_skill: { label: "Unhide Skill", icon: <Eye className="h-4 w-4" />, color: "text-green-500" },
  set_featured: { label: "Set Featured", icon: <Star className="h-4 w-4" />, color: "text-yellow-500" },
  set_verified: { label: "Set Verified", icon: <BadgeCheck className="h-4 w-4" />, color: "text-blue-500" },
  set_user_role: { label: "Set User Role", icon: <Users className="h-4 w-4" />, color: "text-purple-500" },
  set_bot_role: { label: "Set Bot Role", icon: <Bot className="h-4 w-4" />, color: "text-orange-500" },
  create_bot: { label: "Create Bot", icon: <Bot className="h-4 w-4" />, color: "text-green-500" },
  revoke_bot: { label: "Revoke Bot", icon: <Bot className="h-4 w-4" />, color: "text-red-500" },
};

export default function AdminAuditPage() {
  const { clerkId } = useAdminRole();
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState<TargetTypeFilter>("all");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const logsData = useQuery(
    api.admin.listAuditLogs,
    clerkId
      ? {
          clerkId,
          limit: pageSize,
          offset: page * pageSize,
          actionFilter: actionFilter !== "all" ? actionFilter : undefined,
          targetTypeFilter: targetTypeFilter !== "all" ? targetTypeFilter : undefined,
        }
      : "skip"
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatDetails = (action: string, details?: { reason?: string; oldValue?: unknown; newValue?: unknown }) => {
    if (!details) return null;

    if (details.reason) {
      return <span className="text-muted-foreground">Reason: {details.reason}</span>;
    }

    if (details.oldValue !== undefined && details.newValue !== undefined) {
      return (
        <span className="text-muted-foreground">
          {String(details.oldValue)} → {String(details.newValue)}
        </span>
      );
    }

    if (details.newValue !== undefined) {
      return <span className="text-muted-foreground">Set to: {String(details.newValue)}</span>;
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-xl font-semibold">Audit Log</h2>
        <div className="flex gap-2">
          <Select
            value={actionFilter}
            onValueChange={(v) => {
              setActionFilter(v as ActionFilter);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="hide_skill">Hide Skill</SelectItem>
              <SelectItem value="unhide_skill">Unhide Skill</SelectItem>
              <SelectItem value="set_featured">Set Featured</SelectItem>
              <SelectItem value="set_verified">Set Verified</SelectItem>
              <SelectItem value="set_user_role">Set User Role</SelectItem>
              <SelectItem value="set_bot_role">Set Bot Role</SelectItem>
              <SelectItem value="create_bot">Create Bot</SelectItem>
              <SelectItem value="revoke_bot">Revoke Bot</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={targetTypeFilter}
            onValueChange={(v) => {
              setTargetTypeFilter(v as TargetTypeFilter);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter target" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Targets</SelectItem>
              <SelectItem value="skill">Skills</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="bot">Bots</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      {logsData && (
        <p className="text-sm text-muted-foreground">
          Showing {logsData.logs.length} of {logsData.total} entries
        </p>
      )}

      {/* Loading */}
      {!logsData && clerkId && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Log entries */}
      <div className="space-y-2">
        {logsData?.logs.map((log) => {
          const actionInfo = ACTION_LABELS[log.action] ?? {
            label: log.action,
            icon: null,
            color: "text-foreground",
          };

          return (
            <div
              key={log._id}
              className="border rounded-lg p-4 bg-card hover:bg-card/80 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Action icon */}
                <div className={cn("mt-0.5", actionInfo.color)}>
                  {actionInfo.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Actor */}
                    <span className="flex items-center gap-1 font-medium">
                      {log.actorType === "human" ? (
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {log.actorName}
                    </span>

                    {/* Action */}
                    <span className={cn("font-medium", actionInfo.color)}>
                      {actionInfo.label}
                    </span>

                    {/* Target */}
                    <span className="text-muted-foreground">
                      {log.targetType}:
                    </span>
                    <span className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded truncate max-w-[200px]">
                      {log.targetName ?? log.targetId}
                    </span>
                  </div>

                  {/* Details */}
                  {log.details && (
                    <div className="mt-1 text-sm">
                      {formatDetails(log.action, log.details)}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(log.createdAt)}
                </div>
              </div>
            </div>
          );
        })}

        {logsData?.logs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No audit log entries found
          </div>
        )}
      </div>

      {/* Pagination */}
      {logsData && logsData.total > pageSize && (
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
            Page {page + 1} of {Math.ceil(logsData.total / pageSize)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!logsData.hasMore}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
