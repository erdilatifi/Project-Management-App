"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Status = "todo" | "in_progress" | "done";

type TaskRow = {
  id: string;
  project_id: string;
  workspace_id?: string | null;
  title: string;
  description?: string | null;
  status: Status;
  priority?: number | null;
  assignee_id?: string | null;
  due_at?: string | null;
  created_by: string | null;
  created_at: string;
};

type ProjectRow = { id: string; name: string | null };

const priorityLabel = (p?: number | null) => (p ? `P${p}` : "None");

// Due-date helpers to match the project tasks page
type DueCategory = "overdue" | "today" | "nextweek" | "none";
type DueFilter = "all" | DueCategory;

function startOfDay(d: Date) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function endOfDay(d: Date) {
  const dt = new Date(d);
  dt.setHours(23, 59, 59, 999);
  return dt;
}
function plusDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}
function dueCategory(due_at?: string | null): DueCategory {
  if (!due_at) return "none";
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const nextWeekEnd = endOfDay(plusDays(now, 7));
  const due = new Date(due_at);
  if (isNaN(due.getTime())) return "none";
  if (due < todayStart) return "overdue";
  if (due >= todayStart && due <= todayEnd) return "today";
  if (due > todayEnd && due <= nextWeekEnd) return "nextweek";
  return "none";
}
const dueBadgeClass = (cat: DueCategory) => {
  switch (cat) {
    case "overdue":
      return "bg-red-50 text-red-700 border-red-200";
    case "today":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "nextweek":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "none":
    default:
      return "bg-neutral-50 text-neutral-700 border-neutral-200";
  }
};

export default function MyTasksPage() {
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [projects, setProjects] = useState<Record<string, ProjectRow>>({});
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<"none" | "project" | "due">("none");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // No inline assignment controls on this page

  const load = useCallback(async (pageNum: number, append = false) => {
    if (!userId) return;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    const limit = 20;
    const from = (pageNum - 1) * limit;
    const to = from + limit - 1;
    
    try {
      const { data, error, count } = await supabase
        .from("tasks")
        .select(
          "id, project_id, workspace_id, title, description, status, priority, assignee_id, due_at, created_by, created_at",
          { count: 'exact' }
        )
        .eq("assignee_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      const rows = (data ?? []) as TaskRow[];
      
      setHasMore(count ? (pageNum * limit) < count : false);
      
      if (append) {
        setTasks((prev) => [...prev, ...rows]);
      } else {
        setTasks(rows);
      }

      // load project names for linking
      const ids = Array.from(new Set(rows.map((r) => r.project_id).filter(Boolean)));
      if (ids.length) {
        const { data: projs, error: projErr } = await supabase
          .from("projects")
          .select("id, name")
          .in("id", ids);
        if (projErr) throw projErr;
        const map: Record<string, ProjectRow> = {};
        (projs ?? []).forEach((p: any) => (map[p.id as string] = { id: p.id as string, name: (p.name as string) ?? null }));
        setProjects(map);
      } else {
        setProjects({});
      }

      // No extra member data needed here
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Failed to load tasks");
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [supabase, userId]);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setUserId(data.user?.id ?? null);
      } catch {}
    };
    init();
  }, [supabase]);

  useEffect(() => {
    if (userId) {
      setTasks([]);
      setPage(1);
      setHasMore(true);
      load(1, false);
    }
  }, [userId, load]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || search || statusFilter !== 'all' || dueFilter !== 'all') return;
    const nextPage = page + 1;
    setPage(nextPage);
    load(nextPage, true);
  }, [page, loadingMore, hasMore, search, statusFilter, dueFilter, load]);

  // Infinite scroll observer
  useEffect(() => {
    if (loadingMore || !hasMore || search || statusFilter !== 'all' || dueFilter !== 'all') return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observerRef.current.observe(currentRef);
    }

    return () => {
      if (observerRef.current && currentRef) {
        observerRef.current.unobserve(currentRef);
      }
    };
  }, [loadMore, loadingMore, hasMore, search, statusFilter, dueFilter]);

  const filtered = tasks.filter((t) => {
    const matchesStatus = statusFilter === "all" ? true : (t.status ?? "todo") === statusFilter;
    const q = search.trim().toLowerCase();
    const matchesQuery = !q
      ? true
      : t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q);
    const matchesDue = dueFilter === "all" ? true : dueCategory(t.due_at) === dueFilter;
    return matchesStatus && matchesQuery && matchesDue;
  });

  // No assignment handler; handled at task creation/board

  // grouping helpers
  type Group = { key: string; label: string; tasks: TaskRow[] };
  const startOfWeek = (d: Date) => {
    const x = new Date(d);
    const day = x.getDay();
    const diff = (day + 6) % 7; // Monday as start
    x.setDate(x.getDate() - diff);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfWeek = (d: Date) => {
    const s = startOfWeek(d);
    const x = new Date(s);
    x.setDate(s.getDate() + 6);
    x.setHours(23, 59, 59, 999);
    return x;
  };
  const groupTasks = (list: TaskRow[]): Group[] => {
    if (groupBy === "none") return [{ key: "all", label: "All Tasks", tasks: list }];
    if (groupBy === "project") {
      const by: Record<string, TaskRow[]> = {};
      list.forEach((t) => {
        const k = t.project_id || "unknown";
        if (!by[k]) by[k] = [];
        by[k].push(t);
      });
      return Object.keys(by).map((k) => ({ key: k, label: projects[k]?.name ?? "Project", tasks: by[k] }));
    }
    // Due date buckets (fold overdue into Today to match create controls)
    const buckets: Record<Exclude<DueCategory, "overdue">, { label: string; tasks: TaskRow[] }> = {
      today: { label: "Due today", tasks: [] },
      nextweek: { label: "Next week", tasks: [] },
      none: { label: "No due date", tasks: [] },
    };
    list.forEach((t) => {
      const cat = dueCategory(t.due_at);
      const key = cat === "overdue" ? "today" : cat;
      buckets[key].tasks.push(t);
    });
    return (["today", "nextweek", "none"] as const).map((k) => ({ key: k, label: buckets[k].label, tasks: buckets[k].tasks }));
  };
  const groups = groupTasks(filtered);

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto max-w-[1200px] px-3 sm:px-6 lg:px-10 py-8 sm:py-12">
        <div className="mb-6 pt-15 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">My Tasks</h1>
            <p className="text-sm text-muted-foreground mt-0.5">All tasks assigned to you across projects.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks"
              className="w-full sm:w-64 bg-background border-border focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
            />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-10 w-full sm:w-[180px] bg-background border-border rounded-xl">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="todo">To do</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dueFilter} onValueChange={(v) => setDueFilter(v as DueFilter)}>
              <SelectTrigger className="h-10 w-full sm:w-[180px] bg-background border-border rounded-xl">
                <SelectValue placeholder="All due dates" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All due dates</SelectItem>
                <SelectItem value="today">Due today</SelectItem>
                <SelectItem value="nextweek">Next week</SelectItem>
                <SelectItem value="none">No due date</SelectItem>
              </SelectContent>
            </Select>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
              <SelectTrigger className="h-10 w-full sm:w-[180px] bg-background border-border rounded-xl">
                <SelectValue placeholder="Group by" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="none">No grouping</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="due">Due date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl border-border bg-card p-6 text-muted-foreground text-center">
            {userId ? "No tasks assigned to you." : "Sign in to view your tasks."}
          </Card>
        ) : (
          <div className="space-y-8">
            {groups.map((g) => (
              <div key={g.key} className="space-y-3">
                {groupBy !== "none" && (
                  <div className="text-sm font-semibold text-foreground">{g.label}</div>
                )}
                {g.tasks.length === 0 ? (
                  <Card className="rounded-xl border-border bg-card p-4 text-muted-foreground">No tasks</Card>
                ) : (
                  <div className="space-y-4">
                    {g.tasks.map((t) => {
                      return (
                        <Card key={t.id} className="rounded-2xl border-border bg-card p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-foreground font-semibold leading-6 text-base sm:text-base">{t.title}</div>
                              {t.description ? (
                                <div className="mt-1 text-sm text-muted-foreground line-clamp-2">{t.description}</div>
                              ) : null}
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                <Badge variant="outline" className="rounded-lg">
                                  {priorityLabel(t.priority)}
                                </Badge>
                                <Badge variant="outline" className="rounded-lg">
                                  {t.status === "in_progress" ? "In progress" : t.status === "done" ? "Done" : "To do"}
                                </Badge>
                                <Badge variant="outline" className={`${dueBadgeClass(dueCategory(t.due_at))} rounded-lg`}>
                                  {(() => {
                                    const cat = dueCategory(t.due_at);
                                    if (cat === "overdue") return `Overdue${t.due_at ? ` (${new Date(t.due_at).toLocaleDateString()})` : ""}`;
                                    if (cat === "today") return `Due today${t.due_at ? ` (${new Date(t.due_at).toLocaleDateString()})` : ""}`;
                                    if (cat === "nextweek") return `Next week${t.due_at ? ` (${new Date(t.due_at).toLocaleDateString()})` : ""}`;
                                    return t.due_at ? `Due ${new Date(t.due_at).toLocaleDateString()}` : "No due date";
                                  })()}
                                </Badge>
                                {projects[t.project_id] ? (
                                  <Link
                                    href={`/projects/${t.project_id}/tasks`}
                                    className="underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    {projects[t.project_id]?.name ?? "Project"}
                                  </Link>
                                ) : null}
                                <span className="text-muted-foreground">Created {new Date(t.created_at).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {/* Infinite scroll trigger - only when not filtering */}
            {!search && statusFilter === 'all' && dueFilter === 'all' && hasMore && (
              <div ref={loadMoreRef} className="py-8">
                {loadingMore ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading more tasks...
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground">Scroll for more</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
