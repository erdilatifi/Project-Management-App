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
import { Search, RefreshCcw, Trash2, X, Users, MessageSquare, ChevronLeft, ChevronRight, FolderPlus, PanelsTopLeft, FolderKanban } from "lucide-react";
import type { WorkspaceRow as CreatedWorkspaceRow } from "@/utils/supabase/appActions";
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
<<<<<<< HEAD
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
=======
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-accent/12 text-brand-accent ring-1 ring-brand-accent/20 font-semibold">
>>>>>>> origin/polish-protected-routes
        {initial}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto max-w-[1200px] px-3 sm:px-6 lg:px-10 py-8 sm:py-12 space-y-6">
        {/* Header */}
        <div className="pt-15 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="brand-chip h-11 w-11 shrink-0">
              <PanelsTopLeft className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">Workspaces</h1>
              <p className="text-sm text-muted-foreground mt-0.5">All workspaces you can access.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CreateWorkspaceDialog
              onCreated={(ws: CreatedWorkspaceRow) => {
                setItems((cur) => [ws, ...cur.filter((item) => item.id !== ws.id)]);
                reload();
              }}
            />
          </div>
        </div>

        {/* Search / toolbar card */}
        <Card className="glass border-border shadow-sm rounded-2xl">
          <CardContent className="px-3 sm:px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
                  className="pl-9 h-10 w-full bg-background border-border focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
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
                className="rounded-xl shrink-0"
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
                    className="group overflow-hidden rounded-2xl border-border shadow-sm hover:shadow-lg hover:border-border/70 hover:-translate-y-0.5 transition-all duration-200"
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
                      ) : null}
                    </div>

                    <Separator />

                    <div className="p-3 flex flex-wrap items-center justify-end gap-2">
                      <Link href={`/workspaces/${w.id}/people`}>
                        <Button variant="ghost" size="sm" className="h-7 rounded-lg text-muted-foreground hover:text-brand-accent hover:bg-brand-accent/10">
                          <Users className="w-4 h-4 mr-1.5" /> People
                        </Button>
                      </Link>
                      <Link href={`/workspaces/${w.id}/messages`}>
                        <Button variant="ghost" size="sm" className="h-7 rounded-lg text-muted-foreground hover:text-brand-accent hover:bg-brand-accent/10">
                          <MessageSquare className="w-4 h-4 mr-1.5" /> Messages
                        </Button>
                      </Link>
                      <Link href={`/projects`}>
                        <Button variant="ghost" size="sm" className="h-7 rounded-lg text-muted-foreground hover:text-brand-accent hover:bg-brand-accent/10">
                          <FolderKanban className="w-4 h-4 mr-1.5" /> View projects
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
    <Card className="glass overflow-hidden rounded-2xl border-border shadow-sm">
      <div className="px-6 py-14 text-center">
        <div className="brand-chip mx-auto mb-4 h-14 w-14 rounded-2xl">
          <FolderPlus className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No workspaces found</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          Create your first workspace or clear your search to see everything you can access.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button onClick={onReset} variant="outline" className="rounded-xl">
            Clear search
          </Button>
        </div>
      </div>
    </Card>
  );
}
