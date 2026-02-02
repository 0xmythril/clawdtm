"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAdminRole, AdminGuard } from "@/components/admin/admin-guard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Loader2,
  Bot,
  Plus,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Id } from "../../../../convex/_generated/dataModel";

type BotRole = "agent" | "moderator" | "admin";

export default function AdminBotsPage() {
  return (
    <AdminGuard requireAdmin>
      <BotsContent />
    </AdminGuard>
  );
}

function BotsContent() {
  const { clerkId } = useAdminRole();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Create bot dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBotName, setNewBotName] = useState("");
  const [newBotDescription, setNewBotDescription] = useState("");
  const [newBotRole, setNewBotRole] = useState<BotRole>("agent");
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const botsData = useQuery(
    api.admin.listAllBots,
    clerkId
      ? {
          clerkId,
          limit: pageSize,
          offset: page * pageSize,
        }
      : "skip"
  );

  const setBotRole = useMutation(api.admin.setBotRole);
  const createBot = useMutation(api.admin.createPrivilegedBot);
  const revokeBot = useMutation(api.admin.revokeBot);

  const [loadingBots, setLoadingBots] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);

  const handleRoleChange = async (botAgentId: Id<"botAgents">, newRole: BotRole) => {
    if (!clerkId) return;
    setLoadingBots((prev) => ({ ...prev, [botAgentId]: true }));
    try {
      await setBotRole({ clerkId, botAgentId, role: newRole });
    } catch (error) {
      console.error("Failed to update role:", error);
      alert(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setLoadingBots((prev) => ({ ...prev, [botAgentId]: false }));
    }
  };

  const handleRevoke = async (botAgentId: Id<"botAgents">) => {
    if (!clerkId) return;
    if (!confirm("Are you sure you want to revoke this bot's API key?")) return;

    setLoadingBots((prev) => ({ ...prev, [`revoke-${botAgentId}`]: true }));
    try {
      await revokeBot({ clerkId, botAgentId });
    } catch (error) {
      console.error("Failed to revoke bot:", error);
      alert(error instanceof Error ? error.message : "Failed to revoke bot");
    } finally {
      setLoadingBots((prev) => ({ ...prev, [`revoke-${botAgentId}`]: false }));
    }
  };

  const handleCreateBot = async () => {
    if (!clerkId || !newBotName.trim()) return;
    setCreating(true);
    try {
      const result = await createBot({
        clerkId,
        name: newBotName.trim(),
        description: newBotDescription.trim() || undefined,
        role: newBotRole,
      });
      if (result.success && result.apiKey) {
        setCreatedApiKey(result.apiKey);
      }
    } catch (error) {
      console.error("Failed to create bot:", error);
      alert(error instanceof Error ? error.message : "Failed to create bot");
    } finally {
      setCreating(false);
    }
  };

  const handleCopyApiKey = () => {
    if (createdApiKey) {
      navigator.clipboard.writeText(createdApiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const closeCreateDialog = () => {
    setCreateDialogOpen(false);
    setNewBotName("");
    setNewBotDescription("");
    setNewBotRole("agent");
    setCreatedApiKey(null);
    setCopied(false);
  };

  // Filter bots by search
  const filteredBots = botsData?.bots.filter((b) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(searchLower) ||
      b.description?.toLowerCase().includes(searchLower) ||
      b.apiKeyPrefix.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-xl font-semibold">Bot Management</h2>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Bot
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or API key prefix..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      {botsData && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredBots?.length ?? 0} of {botsData.total} bots
        </p>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Bot</th>
              <th className="text-left px-4 py-3 font-medium">API Key</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
              <th className="text-center px-4 py-3 font-medium">Role</th>
              <th className="text-center px-4 py-3 font-medium">Reviews</th>
              <th className="text-left px-4 py-3 font-medium">Last Active</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredBots?.map((bot) => (
              <tr
                key={bot._id}
                className={cn(bot.revokedAt && "bg-destructive/5 opacity-60")}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{bot.name}</span>
                      {bot.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {bot.description}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {bot.apiKeyPrefix}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    {bot.revokedAt ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-destructive/10 text-destructive">
                        Revoked
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          bot.status === "verified"
                            ? "bg-green-500/10 text-green-600"
                            : "bg-yellow-500/10 text-yellow-600"
                        )}
                      >
                        {bot.status}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    <span
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        bot.role === "admin" && "bg-primary/10 text-primary",
                        bot.role === "moderator" && "bg-orange-500/10 text-orange-600",
                        bot.role === "agent" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {bot.role}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">{bot.reviewCount}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(bot.lastActiveAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {loadingBots[bot._id] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : bot.revokedAt ? (
                      <span className="text-xs text-muted-foreground">Revoked</span>
                    ) : (
                      <>
                        <Select
                          value={bot.role}
                          onValueChange={(value) =>
                            handleRoleChange(bot._id as Id<"botAgents">, value as BotRole)
                          }
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="agent">Agent</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevoke(bot._id as Id<"botAgents">)}
                          disabled={loadingBots[`revoke-${bot._id}`]}
                          className="text-destructive hover:text-destructive"
                        >
                          {loadingBots[`revoke-${bot._id}`] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Revoke"
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredBots?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No bots found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {botsData && botsData.total > pageSize && (
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
            Page {page + 1} of {Math.ceil(botsData.total / pageSize)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!botsData.hasMore}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create Bot Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          {createdApiKey ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  Bot Created Successfully
                </DialogTitle>
                <DialogDescription>
                  Copy the API key now. It will only be shown once.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <code className="flex-1 text-sm break-all font-mono">
                    {createdApiKey}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyApiKey}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-600">
                    Save this API key securely. It cannot be retrieved after you close this dialog.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={closeCreateDialog}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Create Privileged Bot</DialogTitle>
                <DialogDescription>
                  Create a new bot with an API key for programmatic access.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="My Admin Bot"
                    value={newBotName}
                    onChange={(e) => setNewBotName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What does this bot do?"
                    value={newBotDescription}
                    onChange={(e) => setNewBotDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newBotRole}
                    onValueChange={(value) => setNewBotRole(value as BotRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent (read/review only)</SelectItem>
                      <SelectItem value="moderator">Moderator (can hide skills)</SelectItem>
                      <SelectItem value="admin">Admin (full access)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeCreateDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateBot}
                  disabled={creating || !newBotName.trim()}
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Create Bot
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
