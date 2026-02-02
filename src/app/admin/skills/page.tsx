"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAdminRole } from "@/components/admin/admin-guard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Star,
  Eye,
  EyeOff,
  CheckCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

type Filter = "all" | "hidden" | "featured" | "verified";

export default function AdminSkillsPage() {
  const { clerkId } = useAdminRole();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Hide dialog state
  const [hideDialogOpen, setHideDialogOpen] = useState(false);
  const [hideSlug, setHideSlug] = useState("");
  const [hideReason, setHideReason] = useState("");

  const skillsData = useQuery(
    api.admin.listSkillsForAdmin,
    clerkId
      ? {
          clerkId,
          limit: pageSize,
          offset: page * pageSize,
          search: search || undefined,
          filter,
        }
      : "skip"
  );

  const setFeatured = useMutation(api.admin.setSkillFeatured);
  const setVerified = useMutation(api.admin.setSkillVerified);
  const hideSkill = useMutation(api.admin.adminHideSkill);
  const unhideSkill = useMutation(api.admin.adminUnhideSkill);

  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

  const handleToggleFeatured = async (slug: string, currentValue: boolean) => {
    if (!clerkId) return;
    setLoadingActions((prev) => ({ ...prev, [`featured-${slug}`]: true }));
    try {
      await setFeatured({ clerkId, slug, featured: !currentValue });
    } finally {
      setLoadingActions((prev) => ({ ...prev, [`featured-${slug}`]: false }));
    }
  };

  const handleToggleVerified = async (slug: string, currentValue: boolean) => {
    if (!clerkId) return;
    setLoadingActions((prev) => ({ ...prev, [`verified-${slug}`]: true }));
    try {
      await setVerified({ clerkId, slug, verified: !currentValue });
    } finally {
      setLoadingActions((prev) => ({ ...prev, [`verified-${slug}`]: false }));
    }
  };

  const handleHide = async () => {
    if (!clerkId || !hideSlug) return;
    setLoadingActions((prev) => ({ ...prev, [`hide-${hideSlug}`]: true }));
    try {
      await hideSkill({ clerkId, slug: hideSlug, reason: hideReason || undefined });
      setHideDialogOpen(false);
      setHideSlug("");
      setHideReason("");
    } finally {
      setLoadingActions((prev) => ({ ...prev, [`hide-${hideSlug}`]: false }));
    }
  };

  const handleUnhide = async (slug: string) => {
    if (!clerkId) return;
    setLoadingActions((prev) => ({ ...prev, [`unhide-${slug}`]: true }));
    try {
      await unhideSkill({ clerkId, slug });
    } finally {
      setLoadingActions((prev) => ({ ...prev, [`unhide-${slug}`]: false }));
    }
  };

  const openHideDialog = (slug: string) => {
    setHideSlug(slug);
    setHideReason("");
    setHideDialogOpen(true);
  };

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All Skills" },
    { value: "hidden", label: "Hidden" },
    { value: "featured", label: "Featured" },
    { value: "verified", label: "Verified" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-xl font-semibold">Skill Management</h2>
        <div className="flex gap-2">
          {filters.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFilter(f.value);
                setPage(0);
              }}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by slug, name, or author..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      {skillsData && (
        <p className="text-sm text-muted-foreground">
          Showing {skillsData.skills.length} of {skillsData.total} skills
        </p>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Skill</th>
              <th className="text-left px-4 py-3 font-medium">Author</th>
              <th className="text-center px-4 py-3 font-medium">Downloads</th>
              <th className="text-center px-4 py-3 font-medium">Rating</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {skillsData?.skills.map((skill) => (
              <tr key={skill._id} className={cn(skill.hidden && "bg-destructive/5")}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/skills/${skill.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline flex items-center gap-1"
                    >
                      {skill.name}
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                    <span className="text-muted-foreground text-xs">/{skill.slug}</span>
                  </div>
                  {skill.hidden && skill.hiddenReason && (
                    <p className="text-xs text-destructive mt-1">
                      Hidden: {skill.hiddenReason}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{skill.author}</td>
                <td className="px-4 py-3 text-center">{skill.downloads.toLocaleString()}</td>
                <td className="px-4 py-3 text-center">
                  {skill.avgRating ? (
                    <span className="text-orange-600">
                      🦞 {skill.avgRating.toFixed(1)} ({skill.reviewCount})
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    {skill.isFeatured && (
                      <span title="Featured" className="text-yellow-500">
                        <Star className="h-4 w-4 fill-current" />
                      </span>
                    )}
                    {skill.isVerified && (
                      <span title="Verified" className="text-green-500">
                        <CheckCircle className="h-4 w-4" />
                      </span>
                    )}
                    {skill.hidden && (
                      <span title="Hidden" className="text-destructive">
                        <EyeOff className="h-4 w-4" />
                      </span>
                    )}
                    {!skill.isFeatured && !skill.isVerified && !skill.hidden && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {/* Featured toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleFeatured(skill.slug, skill.isFeatured)}
                      disabled={loadingActions[`featured-${skill.slug}`]}
                      title={skill.isFeatured ? "Remove from featured" : "Add to featured"}
                    >
                      {loadingActions[`featured-${skill.slug}`] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Star
                          className={cn(
                            "h-4 w-4",
                            skill.isFeatured ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                          )}
                        />
                      )}
                    </Button>

                    {/* Verified toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleVerified(skill.slug, skill.isVerified)}
                      disabled={loadingActions[`verified-${skill.slug}`]}
                      title={skill.isVerified ? "Remove verification" : "Mark as verified"}
                    >
                      {loadingActions[`verified-${skill.slug}`] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle
                          className={cn(
                            "h-4 w-4",
                            skill.isVerified ? "text-green-500" : "text-muted-foreground"
                          )}
                        />
                      )}
                    </Button>

                    {/* Hide/Unhide toggle */}
                    {skill.hidden ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnhide(skill.slug)}
                        disabled={loadingActions[`unhide-${skill.slug}`]}
                        title="Unhide skill"
                      >
                        {loadingActions[`unhide-${skill.slug}`] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openHideDialog(skill.slug)}
                        title="Hide skill"
                      >
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {skillsData?.skills.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No skills found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {skillsData && skillsData.total > pageSize && (
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
            Page {page + 1} of {Math.ceil(skillsData.total / pageSize)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!skillsData.hasMore}
          >
            Next
          </Button>
        </div>
      )}

      {/* Hide Dialog */}
      <Dialog open={hideDialogOpen} onOpenChange={setHideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hide Skill</DialogTitle>
            <DialogDescription>
              This will hide <strong>{hideSlug}</strong> from the public listing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Why is this skill being hidden?"
                value={hideReason}
                onChange={(e) => setHideReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHideDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleHide}
              disabled={loadingActions[`hide-${hideSlug}`]}
            >
              {loadingActions[`hide-${hideSlug}`] ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Hide Skill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
