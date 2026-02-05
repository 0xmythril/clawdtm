"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAdminRole } from "@/components/admin/admin-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Loader2,
  UserX,
  UserCheck,
  Search,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminAuthorsPage() {
  const { clerkId } = useAdminRole();
  const [authorSearch, setAuthorSearch] = useState("");
  const [blockingAuthor, setBlockingAuthor] = useState<string | null>(null);
  const [unblockingAuthor, setUnblockingAuthor] = useState<string | null>(null);

  // Get authors
  const authors = useQuery(
    api.admin.getAuthorsWithCounts,
    clerkId ? { clerkId, includeHidden: true } : "skip"
  );

  // Get auto-block audit logs
  const autoBlockLogs = useQuery(
    api.admin.listAuditLogs,
    clerkId ? { clerkId, actionFilter: "auto_block_author", limit: 100 } : "skip"
  );

  // Build a map of auto-blocked authors with their trigger info
  const autoBlockedAuthors = useMemo(() => {
    const map = new Map<string, { triggerSkill?: string; riskLevel?: string; blockedAt: number }>();
    if (!autoBlockLogs?.logs) return map;
    
    for (const log of autoBlockLogs.logs) {
      if (log.action === "auto_block_author" && log.targetId) {
        // Only keep the most recent auto-block for each author
        if (!map.has(log.targetId)) {
          map.set(log.targetId, {
            triggerSkill: log.details?.triggerSkill,
            riskLevel: log.details?.riskLevel,
            blockedAt: log.createdAt,
          });
        }
      }
    }
    return map;
  }, [autoBlockLogs]);

  // Filter authors by search
  const filteredAuthors = useMemo(() => {
    if (!authors) return [];
    if (!authorSearch.trim()) return authors;
    const search = authorSearch.toLowerCase();
    return authors.filter((a) => a.author.toLowerCase().includes(search));
  }, [authors, authorSearch]);

  // Mutations
  const hideByAuthor = useMutation(api.admin.adminHideSkillsByAuthor);
  const unhideByAuthor = useMutation(api.admin.adminUnhideSkillsByAuthor);

  const handleBlockAuthor = async (author: string) => {
    if (!clerkId) return;
    setBlockingAuthor(author);
    try {
      const result = await hideByAuthor({ 
        clerkId, 
        author, 
        reason: `All skills by ${author} blocked by admin` 
      });
      console.log(`Blocked ${result.hiddenCount} skills by ${author}`);
    } catch (error) {
      console.error("Block author failed:", error);
    } finally {
      setBlockingAuthor(null);
    }
  };

  const handleUnblockAuthor = async (author: string) => {
    if (!clerkId) return;
    setUnblockingAuthor(author);
    try {
      const result = await unhideByAuthor({ clerkId, author });
      console.log(`Unblocked ${result.unhiddenCount} skills by ${author}`);
    } catch (error) {
      console.error("Unblock author failed:", error);
    } finally {
      setUnblockingAuthor(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Author Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Block or unblock all skills from specific authors
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search authors..."
          value={authorSearch}
          onChange={(e) => setAuthorSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      {authors && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredAuthors.length} of {authors.length} authors
          {authorSearch && ` matching "${authorSearch}"`}
        </p>
      )}

      {/* Table */}
      {authors === undefined ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredAuthors.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          {authorSearch ? "No authors found" : "No authors yet"}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Author</th>
                <th className="text-center px-4 py-3 font-medium">Total Skills</th>
                <th className="text-center px-4 py-3 font-medium">Hidden</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredAuthors.map((author) => {
                const allBlocked = author.hidden === author.total && author.total > 0;
                const someBlocked = author.hidden > 0 && author.hidden < author.total;
                const autoBlockInfo = autoBlockedAuthors.get(author.author);
                const isAutoBlocked = allBlocked && autoBlockInfo;
                
                return (
                  <tr 
                    key={author.author} 
                    className={cn(allBlocked && "bg-destructive/5")}
                  >
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {author.author}
                        {isAutoBlocked && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <ShieldAlert className="h-4 w-4 text-destructive" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">Auto-blocked by Security Scanner</p>
                                {autoBlockInfo.triggerSkill && (
                                  <p className="text-xs text-muted-foreground">
                                    Trigger: {autoBlockInfo.triggerSkill}
                                  </p>
                                )}
                                {autoBlockInfo.riskLevel && (
                                  <p className="text-xs">
                                    Risk: <span className={cn(
                                      autoBlockInfo.riskLevel === "critical" && "text-red-500",
                                      autoBlockInfo.riskLevel === "high" && "text-orange-500"
                                    )}>{autoBlockInfo.riskLevel}</span>
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{author.total}</td>
                    <td className="px-4 py-3 text-center">
                      {author.hidden > 0 ? (
                        <span className="text-destructive">{author.hidden}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {allBlocked ? (
                        <div className="flex items-center justify-center gap-1">
                          {isAutoBlocked ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Auto-Blocked
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Blocked</Badge>
                          )}
                        </div>
                      ) : someBlocked ? (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">Partial</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Block button - show if not all blocked */}
                        {author.hidden < author.total && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleBlockAuthor(author.author)}
                            disabled={blockingAuthor === author.author}
                          >
                            {blockingAuthor === author.author ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserX className="h-4 w-4" />
                            )}
                            <span className="ml-1">Block All</span>
                          </Button>
                        )}
                        
                        {/* Unblock button - show if any are blocked */}
                        {author.hidden > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnblockAuthor(author.author)}
                            disabled={unblockingAuthor === author.author}
                          >
                            {unblockingAuthor === author.author ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                            <span className="ml-1">Unblock</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
