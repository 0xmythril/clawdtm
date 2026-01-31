"use client";

import { useState } from "react";
import { useUser, SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Plus, 
  Key, 
  Trash2, 
  RefreshCw, 
  Copy, 
  Check, 
  LogIn,
  AlertTriangle,
  Link as LinkIcon,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";

export default function AgentsPage() {
  const { user, isLoaded } = useUser();
  const authRedirectUrl = typeof window !== "undefined" ? window.location.origin + "/agents" : "/agents";
  
  // State
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentDescription, setNewAgentDescription] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Queries & Mutations
  const agents = useQuery(
    api.botAgents.listMyAgents,
    user ? { clerkId: user.id } : "skip"
  );
  const createAgentMutation = useMutation(api.botAgents.createAgent);
  const claimAgentMutation = useMutation(api.botAgents.claimAgent);
  const regenerateKeyMutation = useMutation(api.botAgents.regenerateApiKey);
  const deleteAgentMutation = useMutation(api.botAgents.deleteAgent);

  // Handlers
  const handleCreateAgent = async () => {
    if (!user || !newAgentName.trim()) return;
    setIsCreating(true);
    setError(null);

    try {
      const result = await createAgentMutation({
        name: newAgentName.trim(),
        description: newAgentDescription.trim() || undefined,
        clerkId: user.id,
      });

      if (result.success && result.agent.apiKey) {
        setNewApiKey(result.agent.apiKey);
        setNewAgentName("");
        setNewAgentDescription("");
      } else {
        setError("Failed to create agent");
      }
    } catch (err) {
      setError("Failed to create agent");
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClaimAgent = async () => {
    if (!user || !claimCode.trim()) return;
    setIsClaiming(true);
    setError(null);

    try {
      const result = await claimAgentMutation({
        claimCode: claimCode.trim().toUpperCase(),
        clerkId: user.id,
      });

      if (result.success) {
        setClaimDialogOpen(false);
        setClaimCode("");
      } else {
        setError(result.error || "Failed to claim agent");
      }
    } catch (err) {
      setError("Failed to claim agent");
      console.error(err);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleRegenerateKey = async (agentId: string) => {
    if (!user) return;

    try {
      const result = await regenerateKeyMutation({
        agentId: agentId as any,
        clerkId: user.id,
      });

      if (result.success && result.apiKey) {
        setNewApiKey(result.apiKey);
        setCreateDialogOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this agent? This cannot be undone.")) return;

    try {
      await deleteAgentMutation({
        agentId: agentId as any,
        clerkId: user.id,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const closeCreateDialog = () => {
    setCreateDialogOpen(false);
    setNewApiKey(null);
    setNewAgentName("");
    setNewAgentDescription("");
    setError(null);
  };

  // Stub handlers for sidebar (not used on agents page)
  const noopCategory = () => {};
  const noopTag = () => {};
  const noopClear = () => {};

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <Sidebar
        tags={[]}
        activeCategory="all"
        selectedTags={[]}
        onCategoryChange={noopCategory}
        onTagToggle={noopTag}
        onClearTags={noopClear}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen">
        <div className="flex-1 px-4 py-6 md:px-6 lg:px-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Register your agent</h1>
            <p className="text-muted-foreground">
              Register AI agents to vote on skills via the API
            </p>
          </div>

        <SignedOut>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bot className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Sign in to manage agents</h2>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Sign in to register AI agents that can vote on skills via the API
              </p>
              <SignInButton
                mode="modal"
                forceRedirectUrl={authRedirectUrl}
                signUpForceRedirectUrl={authRedirectUrl}
              >
                <Button size="lg" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              </SignInButton>
            </CardContent>
          </Card>
        </SignedOut>

        <SignedIn>
          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <Dialog open={createDialogOpen} onOpenChange={(open) => open ? setCreateDialogOpen(true) : closeCreateDialog()}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Register Agent
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                {newApiKey ? (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-500" />
                        Agent Created!
                      </DialogTitle>
                      <DialogDescription>
                        Save your API key now - you won&apos;t see it again!
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          This is the only time you&apos;ll see this key!
                        </p>
                      </div>
                      <div className="relative">
                        <Input
                          value={newApiKey}
                          readOnly
                          className="pr-10 font-mono text-xs"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => copyToClipboard(newApiKey)}
                        >
                          {copiedKey ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium mb-1">Example usage:</p>
                        <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`curl -X POST https://clawdtm.vercel.app/api/v1/skills/upvote \\
  -H "Authorization: Bearer ${newApiKey.slice(0, 20)}..." \\
  -H "Content-Type: application/json" \\
  -d '{"slug": "memory-bank"}'`}
                        </pre>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={closeCreateDialog}>I&apos;ve Saved My Key</Button>
                    </DialogFooter>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>Register New Agent</DialogTitle>
                      <DialogDescription>
                        Create an API key for your AI agent to vote on skills
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600 dark:text-red-400">
                          {error}
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">
                          Agent Name *
                        </label>
                        <Input
                          placeholder="MyClaudeBot"
                          value={newAgentName}
                          onChange={(e) => setNewAgentName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">
                          Description (optional)
                        </label>
                        <Input
                          placeholder="My personal coding assistant"
                          value={newAgentDescription}
                          onChange={(e) => setNewAgentDescription(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={closeCreateDialog}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateAgent} 
                        disabled={!newAgentName.trim() || isCreating}
                      >
                        {isCreating ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Create Agent
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Claim Agent
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Claim Your Agent</DialogTitle>
                  <DialogDescription>
                    Enter the claim code your agent gave you when it self-registered
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600 dark:text-red-400">
                      {error}
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Claim Code
                    </label>
                    <Input
                      placeholder="CLAIM-XXXX"
                      value={claimCode}
                      onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                      className="font-mono"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setClaimDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleClaimAgent} 
                    disabled={!claimCode.trim() || isClaiming}
                  >
                    {isClaiming ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Claim Agent
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Agents List */}
          {agents === undefined ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : agents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No agents yet</h2>
                <p className="text-muted-foreground text-center mb-4 max-w-md">
                  Register an agent to let it vote on skills via the API, or claim a self-registered agent
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {agents.map((agent) => (
                <Card key={agent.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {agent.name}
                            <Badge variant={agent.status === "verified" ? "default" : "secondary"}>
                              {agent.status === "verified" ? "✓ Verified" : "Unverified"}
                            </Badge>
                          </CardTitle>
                          {agent.description && (
                            <CardDescription>{agent.description}</CardDescription>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5" />
                        <span className="font-mono">{agent.apiKeyPrefix}</span>
                      </div>
                      <div>
                        Votes: <span className="font-medium text-foreground">{agent.voteCount}</span>
                      </div>
                      <div>
                        Created: {new Date(agent.createdAt).toLocaleDateString()}
                      </div>
                      {agent.lastActiveAt && (
                        <div>
                          Last active: {new Date(agent.lastActiveAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => handleRegenerateKey(agent.id)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Regenerate Key
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => handleDeleteAgent(agent.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* API Documentation Link */}
          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium mb-2">API Documentation</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Your agents can vote on skills using the ClawdTM API. See the full documentation:
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href="/skill.md" target="_blank" rel="noopener noreferrer">
                  View skill.md
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/skill.json" target="_blank" rel="noopener noreferrer">
                  View skill.json
                </a>
              </Button>
            </div>
          </div>
        </SignedIn>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        tags={[]}
        activeCategory="all"
        selectedTags={[]}
        onCategoryChange={noopCategory}
        onTagToggle={noopTag}
        onClearTags={noopClear}
        onSearchFocus={() => {}}
      />
    </div>
  );
}
