"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAdminRole } from "@/components/admin/admin-guard";
import { Button } from "@/components/ui/button";
import {
  Bug,
  Lightbulb,
  Shield,
  MessageSquare,
  Loader2,
  CheckCircle2,
  Eye,
  XCircle,
  ChevronDown,
  ChevronUp,
  Mail,
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
import type { Id } from "../../../../convex/_generated/dataModel";

type StatusFilter = "all" | "new" | "reviewed" | "resolved" | "dismissed";
type TypeFilter = "all" | "bug" | "feature" | "security" | "general";

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  bug: { label: "Bug", icon: <Bug className="h-3.5 w-3.5" />, color: "text-red-500 bg-red-500/10" },
  feature: { label: "Feature", icon: <Lightbulb className="h-3.5 w-3.5" />, color: "text-yellow-500 bg-yellow-500/10" },
  security: { label: "Security", icon: <Shield className="h-3.5 w-3.5" />, color: "text-orange-500 bg-orange-500/10" },
  general: { label: "General", icon: <MessageSquare className="h-3.5 w-3.5" />, color: "text-blue-500 bg-blue-500/10" },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  new: { label: "New", icon: <Mail className="h-3.5 w-3.5" />, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  reviewed: { label: "Reviewed", icon: <Eye className="h-3.5 w-3.5" />, color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  resolved: { label: "Resolved", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-green-500 bg-green-500/10 border-green-500/20" },
  dismissed: { label: "Dismissed", icon: <XCircle className="h-3.5 w-3.5" />, color: "text-muted-foreground bg-muted/50 border-border" },
};

export default function AdminFeedbackPage() {
  const { clerkId } = useAdminRole();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const pageSize = 25;

  const updateStatus = useMutation(api.feedback.updateFeedbackStatus);

  const counts = useQuery(
    api.feedback.getFeedbackCounts,
    clerkId ? { clerkId } : "skip"
  );

  const feedbackData = useQuery(
    api.feedback.listFeedback,
    clerkId
      ? {
          clerkId,
          limit: pageSize,
          offset: page * pageSize,
          statusFilter: statusFilter !== "all" ? statusFilter : undefined,
          typeFilter: typeFilter !== "all" ? typeFilter : undefined,
        }
      : "skip"
  );

  const handleStatusChange = async (
    feedbackId: Id<"feedback">,
    newStatus: "new" | "reviewed" | "resolved" | "dismissed"
  ) => {
    if (!clerkId) return;
    try {
      await updateStatus({
        clerkId,
        feedbackId,
        status: newStatus,
        adminNote: adminNote.trim() || undefined,
      });
      setAdminNote("");
    } catch (err) {
      console.error("Failed to update feedback status:", err);
    }
  };

  const totalPages = feedbackData ? Math.ceil(feedbackData.total / pageSize) : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold">User Feedback</h2>
          <p className="text-sm text-muted-foreground">
            Review and manage feedback submitted by users
          </p>
        </div>
      </div>

      {/* Status counts */}
      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { key: "total", label: "Total", count: counts.total, color: "border-border" },
            { key: "new", label: "New", count: counts.new, color: "border-blue-500/30" },
            { key: "reviewed", label: "Reviewed", count: counts.reviewed, color: "border-yellow-500/30" },
            { key: "resolved", label: "Resolved", count: counts.resolved, color: "border-green-500/30" },
            { key: "dismissed", label: "Dismissed", count: counts.dismissed, color: "border-muted" },
          ].map(({ key, label, count, color }) => (
            <button
              key={key}
              onClick={() => {
                setStatusFilter(key === "total" ? "all" : (key as StatusFilter));
                setPage(0);
              }}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors cursor-pointer hover:bg-accent/50",
                color,
                statusFilter === (key === "total" ? "all" : key) && "bg-accent"
              )}
            >
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(0); }}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={(v) => { setTypeFilter(v as TypeFilter); setPage(0); }}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="bug">Bug</SelectItem>
            <SelectItem value="feature">Feature</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Feedback list */}
      {!feedbackData ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : feedbackData.items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No feedback found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {feedbackData.items.map((item) => {
            const typeInfo = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.general;
            const statusInfo = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.new;
            const isExpanded = expandedId === item._id;

            return (
              <div
                key={item._id}
                className={cn(
                  "rounded-lg border transition-colors",
                  item.status === "new" && "border-blue-500/20",
                  item.type === "security" && item.status === "new" && "border-orange-500/30 bg-orange-500/[0.02]"
                )}
              >
                {/* Row header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item._id)}
                  className="w-full flex items-center gap-3 p-3 text-left cursor-pointer hover:bg-accent/30 transition-colors"
                >
                  {/* Type badge */}
                  <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0", typeInfo.color)}>
                    {typeInfo.icon}
                    {typeInfo.label}
                  </span>

                  {/* Subject / message preview */}
                  <span className="flex-1 min-w-0 text-sm truncate">
                    {item.subject || item.message.slice(0, 80)}
                  </span>

                  {/* Status */}
                  <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shrink-0", statusInfo.color)}>
                    {statusInfo.icon}
                    {statusInfo.label}
                  </span>

                  {/* Time */}
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>

                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t px-4 py-4 space-y-4">
                    {/* User info */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {item.submitterName ?? "Unknown"}
                      </span>
                      {item.submitterEmail && (
                        <a
                          href={`mailto:${item.submitterEmail}`}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {item.submitterEmail}
                        </a>
                      )}
                      <span>
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {/* Subject */}
                    {item.subject && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Subject</p>
                        <p className="text-sm font-medium">{item.subject}</p>
                      </div>
                    )}

                    {/* Full message */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Message</p>
                      <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded-lg p-3">
                        {item.message}
                      </p>
                    </div>

                    {/* Admin note (existing) */}
                    {item.adminNote && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Admin Note</p>
                        <p className="text-sm bg-primary/5 rounded-lg p-3 border border-primary/10">
                          {item.adminNote}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 pt-2 border-t border-border/40">
                      {/* Admin note input */}
                      <div className="flex-1 w-full sm:w-auto">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Admin note (optional)
                        </label>
                        <input
                          type="text"
                          value={expandedId === item._id ? adminNote : ""}
                          onChange={(e) => setAdminNote(e.target.value)}
                          placeholder="Add a note..."
                          className="w-full h-8 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>

                      {/* Status buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {item.status !== "reviewed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 cursor-pointer"
                            onClick={() => handleStatusChange(item._id as Id<"feedback">, "reviewed")}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Mark Reviewed
                          </Button>
                        )}
                        {item.status !== "resolved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-green-600 border-green-500/30 hover:bg-green-500/10 cursor-pointer"
                            onClick={() => handleStatusChange(item._id as Id<"feedback">, "resolved")}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Resolve
                          </Button>
                        )}
                        {item.status !== "dismissed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-muted-foreground cursor-pointer"
                            onClick={() => handleStatusChange(item._id as Id<"feedback">, "dismissed")}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Dismiss
                          </Button>
                        )}
                        {(item.status === "resolved" || item.status === "dismissed") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 cursor-pointer"
                            onClick={() => handleStatusChange(item._id as Id<"feedback">, "new")}
                          >
                            Reopen
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, feedbackData?.total ?? 0)} of {feedbackData?.total ?? 0}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="h-8 cursor-pointer"
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="h-8 cursor-pointer"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
