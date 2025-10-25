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
import { Search, RefreshCcw, Trash2, X, Users, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  owner_id: string;
  created_at: string;
};

export default function WorkspacesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<WorkspaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [wsToDelete, setWsToDelete] = useState<WorkspaceRow | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("workspaces")
        .select("id, name, slug, description, owner_id, created_at")
        .order("created_at", { ascending: false });

      if (search.trim()) {
        const like = `%${search.trim()}%`;
        query = query.or(`name.ilike.${like},description.ilike.${like},slug.ilike.${like}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setItems(data ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      toast.error(e?.message ?? "Failed to delete workspace");
    } finally {
      setDeleting(false);
    }
  };

  // Simple avatar from initial
  const Avatar = ({ name }: { name: string }) => {
    const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700">
        {initial}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(90rem_50rem_at_50%_-10%,rgba(0,0,0,0.05),transparent)]">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-10 py-12 space-y-6">
        {/* Sticky header (matches tasks page vibe) */}
        <div className="sticky top-0 z-10 -mx-6 lg:-mx-10 px-6 lg:px-10 py-4 ">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Workspaces</h1>
              <p className="text-sm text-neutral-600 mt-0.5">All workspaces you can access.</p>
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
        </div>

        {/* Search / toolbar card */}
        <Card className="border-neutral-200 shadow-sm rounded-2xl">
          <CardContent className="px-4 sm:px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") load(); }}
                  placeholder="Search workspaces (Ctrl/Cmd+K)"
                  className="pl-9 pr-8 bg-white border-neutral-300 focus-visible:ring-2 focus-visible:ring-neutral-300 rounded-xl"
                />
                {search ? (
                  <button
                    aria-label="Clear search"
                    onClick={() => {
                      setSearch("");
                      searchRef.current?.focus();
                      load();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <Button
                variant="outline"
                onClick={() => load()}
                className="rounded-xl border-neutral-300 text-neutral-900 hover:bg-neutral-50"
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
              <Card key={i} className="p-5 rounded-2xl border-neutral-200 shadow-sm">
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
        ) : items.length === 0 ? (
          <Card className="overflow-hidden rounded-2xl border-neutral-200">
            <div className="px-6 py-12 text-center">
              <div className="mx-auto max-w-md">
                <h3 className="text-lg font-medium text-neutral-900">No workspaces found</h3>
                <p className="mt-1 text-sm text-neutral-600">
                  Try adjusting your search, or create a new workspace to get started.
                </p>
                <div className="mt-4">
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
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {items.map((w) => (
              <Card
                key={w.id}
                className="group overflow-hidden rounded-2xl border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all"
              >
                <div className="p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar name={w.name} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-medium text-neutral-900 leading-6 line-clamp-2">{w.name}</h2>
                          {w.slug ? (
                            <Badge variant="outline" className="border-neutral-300 text-neutral-700 bg-neutral-50">
                              {w.slug}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="text-xs text-neutral-500 mt-1">
                          Created {new Date(w.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(w)}
                        className="rounded-lg"
                        title={`Delete ${w.name}`}
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </div>

                  {w.description ? (
                    <p className="text-sm text-neutral-700 leading-6 line-clamp-3">{w.description}</p>
                  ) : (
                    <p className="text-sm text-neutral-500">No description</p>
                  )}
                </div>

                <Separator className="bg-neutral-200" />

                <div className="p-3 flex items-center justify-end gap-2">
                  <Link href={`/workspaces/${w.id}/people`}>
                    <Button variant="outline" size="sm" className="h-7 rounded-lg border-neutral-300">
                      <Users className="w-4 h-4 mr-1.5" /> People
                    </Button>
                  </Link>
                  <Link href={`/workspaces/${w.id}/messages`}>
                    <Button variant="outline" size="sm" className="h-7 rounded-lg border-neutral-300">
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
                {deleting ? "Deletingâ€¦" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}


