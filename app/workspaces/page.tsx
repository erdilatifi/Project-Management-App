"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import CreateWorkspaceDialog from "@/components/workspaces/CreateWorkspaceDialog";
import { Search, RefreshCcw, Trash2, X, Users, MessageSquare, ChevronLeft, ChevronRight, FolderPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useWorkspaces, WorkspaceRow } from "@/hooks/useWorkspaces";

export default function WorkspacesPage() {
  const supabase = useMemo(() => createClient(), []);
  const {
    items,
    loading,
    error,
    search,
    setSearch,
    page,
    setPage,
    canPrev,
    canNext,
    total,
    setItems,
    reload,
  } = useWorkspaces({ pageSize: 10 });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [wsToDelete, setWsToDelete] = useState<WorkspaceRow | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setUserId(data.user?.id ?? null);
      } catch {}
    };
    initUser();
  }, [supabase]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onDelete = (ws: WorkspaceRow) => {
    setWsToDelete(ws);
    setConfirmOpen(true);
  };

  const onDeleteConfirmed = async () => {
    if (!wsToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("workspaces").delete().eq("id", wsToDelete.id);
      if (error) throw error;
      toast.success("Workspace deleted");
      setItems((cur) => cur.filter((w) => w.id !== wsToDelete.id));
      setConfirmOpen(false);
      setWsToDelete(null);
    } catch (e: any) {
      const msg = e?.message || "Failed to delete workspace";
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("not allowed")) {
        toast.error("Not allowed");
      } else {
        toast.error(msg);
      }
    } finally {
      setDeleting(false);
    }
  };

  // Simple avatar from initial
  const Avatar = ({ name }: { name: string }) => {
    const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
        {initial}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto max-w-[1200px] px-3 sm:px-6 lg:px-10 py-8 sm:py-12 space-y-6">
        {/* Header */}
        <div className="pt-15 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">Workspaces</h1>
            <p className="text-sm text-muted-foreground mt-0.5">All workspaces you can access.</p>
          </div>
          <div className="flex items-center gap-2">
            <CreateWorkspaceDialog
              onCreated={(ws) =>
                setItems((cur) => [
                  {
                    id: ws.id,
                    name: ws.name,
                    slug: null,
                    description: null,
                    owner_id: "",
                    created_at: new Date().toISOString()
                  },
                  ...cur
                ])
              }
            />
          </div>
        </div>

        {/* Search / toolbar card */}
        <Card className="border-border shadow-sm rounded-2xl">
          <CardContent className="px-3 sm:px-6 py-4">
            <div className="flex flex-col gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") reload(); }}
                  placeholder="Search workspaces (Ctrl/Cmd+K)"
                  className="pl-9 h-10 w-full bg-background/50 backdrop-blur-sm border-border focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                />
                {search ? (
                  <button
                    aria-label="Clear search"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                      searchRef.current?.focus();
                      reload();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <Button
                variant="outline"
                onClick={() => reload()}
                className="rounded-xl"
              >
                <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-5 rounded-2xl border-border shadow-sm">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-5 w-1/2 rounded-md" />
                </div>
                <div className="mt-3 space-y-2">
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-3/4 rounded" />
                </div>
                <div className="mt-4">
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {items.length === 0 ? (
              <EmptyState onReset={() => { setSearch(""); setPage(1); reload(); }} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {items.map((w) => (
                  <Card
                    key={w.id}
                    className="group overflow-hidden rounded-2xl border-border shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="p-5 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <Avatar name={w.name} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="font-semibold text-foreground leading-6 line-clamp-2">{w.name}</h2>
                              {w.slug ? (
                                <Badge variant="outline" className="rounded-lg">
                                  {w.slug}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Created {new Date(w.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {userId && userId === w.owner_id ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => onDelete(w)}
                              className="rounded-lg"
                              title={`Delete ${w.name}`}
                            >
                              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      {w.description ? (
                        <p className="text-sm text-muted-foreground leading-6 line-clamp-3">{w.description}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No description</p>
                      )}
                    </div>

                    <Separator />

                    <div className="p-3 flex items-center justify-end gap-2">
                      <Link href={`/workspaces/${w.id}/people`}>
                        <Button variant="outline" size="sm" className="h-7 rounded-lg">
                          <Users className="w-4 h-4 mr-1.5" /> People
                        </Button>
                      </Link>
                      <Link href={`/workspaces/${w.id}/messages`}>
                        <Button variant="outline" size="sm" className="h-7 rounded-lg">
                          <MessageSquare className="w-4 h-4 mr-1.5" /> Messages
                        </Button>
                      </Link>
                      <Link href={`/projects`}>
                        <Button variant="ghost" size="sm" className="h-7 rounded-lg">
                          View projects
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Page {page} • {total} total
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  disabled={!canPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-xl"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={!canNext}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl"
                >
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Confirm delete dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Delete workspace</DialogTitle>
              <DialogDescription>
                {wsToDelete ? `Delete "${wsToDelete.name}"? This action cannot be undone.` : ""}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={onDeleteConfirmed} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border">
      <div className="px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
          <FolderPlus className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No workspaces found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your search or create a new workspace to get started.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button onClick={onReset} variant="outline" className="rounded-xl">
            Clear search
          </Button>
        </div>
      </div>
    </Card>
  );
}
