"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import CreateProjectDialog from "@/components/projects/CreateProjectDialog";
import CreateWorkspaceDialog from "@/components/workspaces/CreateWorkspaceDialog";
import EditProjectMenu from "@/components/projects/EditProjectMenu";
import { useProjects, ProjectRow } from "@/hooks/useProjects";
import { Search, RefreshCcw, FolderPlus, ChevronLeft, ChevronRight, X } from "lucide-react";

export default function ProjectsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [booting, setBooting] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
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
    setWorkspaceId,
    workspaceId,
    setItems,
    reload,
  } = useProjects({ pageSize: 10 });

  const searchRef = useRef<HTMLInputElement>(null);

  // Initialize user and workspace context on component mount
  useEffect(() => {
    const init = async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes.user?.id;
        setUserId(uid ?? null);
        if (!uid) {
          setBooting(false);
          return;
        }
        const { data, error } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .limit(1);
        if (error) throw error;
        const ws = data?.[0]?.workspace_id ?? null;
        setWorkspaceId(ws);
      } catch {
        toast("Showing all accessible projects");
      } finally {
        setBooting(false);
      }
    };
    init();
  }, [supabase, setWorkspaceId]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // Keyboard shortcut: Cmd/Ctrl+K to focus search input
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

  // Add newly created project to the list
  const onCreated = (p: { id: string; name: string; description: string | null; workspace_id?: string }) => {
    setItems((cur) => [
      {
        id: p.id,
        name: p.name,
        description: p.description,
        workspace_id: p.workspace_id ?? workspaceId ?? "",
        created_by: null,
        created_at: new Date().toISOString(),
        is_archived: false,
      } as ProjectRow,
      ...cur,
    ]);
  };

  // Update project in the list after edit
  const onUpdated = (p: { id: string; name: string; description: string | null; is_archived?: boolean | null }) => {
    setItems((cur) => cur.map((it) => (it.id === p.id ? ({ ...it, ...p } as any) : it)));
  };

  // Display project avatar with first letter of name
  const Avatar = ({ name }: { name: string }) => {
    const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700">
        {initial}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-10 py-12 space-y-6">
        {/* Header */}
        <div className="pt-15 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage projects in your current workspace.</p>
          </div>
          <div className="flex items-center gap-2">
            <CreateWorkspaceDialog onCreated={(ws) => setWorkspaceId(ws.id)} />
            <CreateProjectDialog workspaceId={workspaceId} onCreated={onCreated} />
          </div>
        </div>

        {/* Controls */}
        <Card className="border-border shadow-sm rounded-2xl">
          <CardContent className="px-4 sm:px-6 py-4">
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") reload();
                  }}
                  placeholder="Search projects (Cmd/Ctrl+K)"
                  className="pl-9 pr-8 bg-background border-border focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
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
        {booting || loading ? (
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
                {items.map((p) => (
                  <Card
                    key={p.id}
                    className="group overflow-hidden rounded-2xl border-border shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="p-5 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <Avatar name={p.name} />
                          <div className="min-w-0">
                            <Link
                              href={`/projects/${p.id}`}
                              className="font-semibold text-foreground hover:underline leading-6 line-clamp-2"
                            >
                              {p.name}
                            </Link>
                            <div className="mt-1 flex items-center gap-2">
                              {p.is_archived ? (
                                <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 rounded-lg">
                                  Archived
                                </Badge>
                              ) : null}
                              <span className="text-xs text-muted-foreground">
                                Created {new Date(p.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {userId && p.created_by === userId ? (
                          <EditProjectMenu
                            project={{ id: p.id, name: p.name, description: p.description }}
                            onUpdated={onUpdated}
                            onDeleted={(id) => setItems((cur) => cur.filter((it) => it.id !== id))}
                          />
                        ) : null}
                      </div>

                      {p.description ? (
                        <p className="text-sm text-muted-foreground leading-6 line-clamp-3">{p.description}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No description</p>
                      )}
                    </div>

                    <Separator />

                    <div className="p-3 flex items-center justify-end gap-2">
                      <Link
                        href={`/projects/${p.id}/tasks`}
                        className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
                      >
                        View tasks
                      </Link>
                      <Link
                        href={`/projects/${p.id}`}
                        className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
                      >
                        Open
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
        <h3 className="text-lg font-semibold text-foreground">No projects found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your search or create a new project to get started.
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
