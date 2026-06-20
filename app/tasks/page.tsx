"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  ListFilter,
  LayoutGrid,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ArrowUpRight,
  CalendarDays,
  Flag,
  CheckSquare,
} from "lucide-react";

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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

// Due-date helpers
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

// Priority config
const priorityConfig: Record<number, { label: string; color: string; dotColor: string }> = {
  1: { label: "Critical", color: "text-red-400", dotColor: "bg-red-400" },
  2: { label: "High", color: "text-orange-400", dotColor: "bg-orange-400" },
  3: { label: "Medium", color: "text-yellow-400", dotColor: "bg-yellow-400" },
  4: { label: "Low", color: "text-green-400", dotColor: "bg-green-400" },
  5: { label: "Trivial", color: "text-blue-400", dotColor: "bg-blue-400" },
};

// Status column config
const statusConfig: Record<Status, { label: string; icon: React.ReactNode; gradient: string; cardAccent: string; badgeBg: string }> = {
  todo: {
    label: "To Do",
    icon: <Circle className="h-4 w-4" />,
    gradient: "from-slate-500/20 to-slate-600/5",
    cardAccent: "bg-gradient-to-b from-slate-400 to-slate-500",
    badgeBg: "bg-slate-500/15 text-slate-300 border-slate-500/20",
  },
  in_progress: {
    label: "In Progress",
    icon: <Clock className="h-4 w-4" />,
    gradient: "from-blue-500/20 to-blue-600/5",
    cardAccent: "bg-gradient-to-b from-blue-400 to-blue-500",
    badgeBg: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  },
  done: {
    label: "Done",
    icon: <CheckCircle2 className="h-4 w-4" />,
    gradient: "from-emerald-500/20 to-emerald-600/5",
    cardAccent: "bg-gradient-to-b from-emerald-400 to-emerald-500",
    badgeBg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  },
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
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async (pageNum: number, append = false) => {
    if (!userId) return;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    const limit = 50;
    const from = (pageNum - 1) * limit;
    const to = from + limit - 1;

    try {
      let query = supabase
        .from("tasks")
        .select(
          "id, project_id, workspace_id, title, description, status, priority, assignee_id, due_at:due_date, created_by:creator_id, created_at",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, to);
      query = query.eq("assignee_id", userId);

      const { data, error, count } = await query;

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
        setProjects((prev) => ({ ...prev, ...map }));
      }
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to load tasks"));
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
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    load(nextPage, true);
  }, [page, loadingMore, hasMore, load]);

  // Infinite scroll observer
  useEffect(() => {
    if (loadingMore || !hasMore) return;

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
  }, [loadMore, loadingMore, hasMore]);

  const filtered = tasks.filter((t) => {
    const matchesStatus = statusFilter === "all" ? true : (t.status ?? "todo") === statusFilter;
    const q = search.trim().toLowerCase();
    const matchesQuery = !q
      ? true
      : t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q);
    const matchesDue = dueFilter === "all" ? true : dueCategory(t.due_at) === dueFilter;
    return matchesStatus && matchesQuery && matchesDue;
  });

  // Board columns
  const columns: Status[] = ["todo", "in_progress", "done"];
  const tasksByStatus = useMemo(() => {
    const map: Record<Status, TaskRow[]> = { todo: [], in_progress: [], done: [] };
    filtered.forEach((t) => {
      const s = t.status ?? "todo";
      if (map[s]) map[s].push(t);
    });
    return map;
  }, [filtered]);

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-10 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 pt-15 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
<<<<<<< HEAD
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
              My Tasks
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filtered.length} task{filtered.length !== 1 ? "s" : ""} assigned to you
            </p>
=======
          <div className="flex items-center gap-3">
            <span className="brand-chip h-12 w-12 shrink-0">
              <CheckSquare className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                My Tasks
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                {filtered.length} task{filtered.length !== 1 ? "s" : ""} assigned to you
              </p>
            </div>
>>>>>>> origin/polish-protected-routes
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "board" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("board")}
              className="rounded-lg h-8"
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1.5" /> Board
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-lg h-8"
            >
              <ListFilter className="h-3.5 w-3.5 mr-1.5" /> List
            </Button>
          </div>
        </div>

        {/* Filters toolbar */}
        <Card className="glass rounded-2xl border-border shadow-sm mb-8">
          <div className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="pl-9 h-10 w-full bg-background border-border focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-10 w-full sm:w-[160px] bg-background border-border rounded-xl">
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
              <SelectTrigger className="h-10 w-full sm:w-[160px] bg-background border-border rounded-xl">
                <SelectValue placeholder="All due dates" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All due dates</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="today">Due today</SelectItem>
                <SelectItem value="nextweek">Next week</SelectItem>
                <SelectItem value="none">No due date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Content */}
        {loading ? (
          <LoadingSkeleton viewMode={viewMode} />
        ) : filtered.length === 0 ? (
          <EmptyState hasUser={!!userId} />
        ) : viewMode === "board" ? (
          /* ===== BOARD VIEW ===== */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {columns.map((status) => {
              const config = statusConfig[status];
              const columnTasks = tasksByStatus[status];
              return (
                <div key={status} className="flex flex-col">
                  {/* Column header */}
                  <div className={`rounded-t-2xl bg-gradient-to-b ${config.gradient} border border-b-0 border-border p-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex items-center justify-center h-7 w-7 rounded-lg ${config.badgeBg}`}>
                          {config.icon}
                        </div>
                        <span className="font-semibold text-foreground text-sm">{config.label}</span>
                      </div>
                      <Badge variant="secondary" className="rounded-full h-6 min-w-[24px] justify-center text-xs font-semibold">
                        {columnTasks.length}
                      </Badge>
                    </div>
                  </div>

                  {/* Column body */}
                  <div className="flex-1 rounded-b-2xl border border-t-0 border-border bg-card/30 p-3 space-y-3 min-h-[200px]">
                    {columnTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground text-sm">
                        <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                          {config.icon}
                        </div>
                        <span>No tasks</span>
                      </div>
                    ) : (
                      columnTasks.map((t) => (
                        <TaskCard key={t.id} task={t} projects={projects} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ===== LIST VIEW ===== */
          <div className="space-y-3">
            {filtered.map((t) => (
              <TaskListItem key={t.id} task={t} projects={projects} />
            ))}
          </div>
        )}

        {/* Infinite scroll trigger */}
        {hasMore && (
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
    </div>
  );
}

/* ===== TASK CARD (Board View) ===== */
function TaskCard({ task, projects }: { task: TaskRow; projects: Record<string, ProjectRow> }) {
  const cat = dueCategory(task.due_at);
  const config = statusConfig[task.status ?? "todo"];
  const pConfig = priorityConfig[task.priority ?? 3] ?? priorityConfig[3];

  return (
    <div className="group relative rounded-xl border border-border glass shadow-sm hover:shadow-lg hover:border-border/80 transition-all duration-200 overflow-hidden">
      {/* Top accent bar */}
      <div className={`h-1 w-full ${config.cardAccent}`} />

      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-foreground text-sm leading-5 line-clamp-2 group-hover:text-brand-accent transition-colors">
          {task.title}
        </h3>

        {/* Description */}
        {task.description && (
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {/* Priority */}
          <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <span className={`h-1.5 w-1.5 rounded-full ${pConfig.dotColor}`} />
            {pConfig.label}
          </span>

          {/* Due date */}
          {cat !== "none" && (
            <DueBadge category={cat} dueAt={task.due_at} />
          )}
        </div>

        {/* Project link */}
        {projects[task.project_id] && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <Link
              href={`/projects/${task.project_id}/tasks`}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group/link"
            >
              <ArrowUpRight className="h-3 w-3 opacity-50 group-hover/link:opacity-100 transition-opacity" />
              {projects[task.project_id]?.name ?? "Project"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== TASK LIST ITEM ===== */
function TaskListItem({ task, projects }: { task: TaskRow; projects: Record<string, ProjectRow> }) {
  const cat = dueCategory(task.due_at);
  const config = statusConfig[task.status ?? "todo"];
  const pConfig = priorityConfig[task.priority ?? 3] ?? priorityConfig[3];

  return (
    <Card className="group rounded-2xl border-border glass p-0 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="flex items-stretch">
        {/* Left accent */}
        <div className={`w-1 shrink-0 ${config.cardAccent}`} />

        <div className="flex-1 p-4 sm:p-5 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <div className={`flex items-center justify-center h-6 w-6 rounded-md ${config.badgeBg}`}>
                {config.icon}
              </div>
              <h3 className="font-semibold text-foreground text-sm sm:text-base leading-6 line-clamp-1">
                {task.title}
              </h3>
            </div>

            {task.description && (
              <p className="mt-1 ml-[34px] text-sm text-muted-foreground line-clamp-1">{task.description}</p>
            )}

            <div className="mt-2.5 ml-[34px] flex flex-wrap items-center gap-2 text-xs">
              {/* Priority */}
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <Flag className={`h-3 w-3 ${pConfig.color}`} />
                {pConfig.label}
              </span>

              {/* Due */}
              <DueBadge category={cat} dueAt={task.due_at} />

              {/* Project */}
              {projects[task.project_id] && (
                <Link
                  href={`/projects/${task.project_id}/tasks`}
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowUpRight className="h-3 w-3" />
                  {projects[task.project_id]?.name ?? "Project"}
                </Link>
              )}

              <span className="text-muted-foreground/60">
                {new Date(task.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ===== DUE BADGE ===== */
function DueBadge({ category, dueAt }: { category: DueCategory; dueAt?: string | null }) {
  const configs: Record<DueCategory, { bg: string; icon: React.ReactNode; text: string }> = {
    overdue: {
      bg: "bg-red-500/15 text-red-300 border-red-500/20",
      icon: <AlertTriangle className="h-3 w-3" />,
      text: `Overdue${dueAt ? ` · ${new Date(dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}`,
    },
    today: {
      bg: "bg-amber-500/15 text-amber-300 border-amber-500/20",
      icon: <Clock className="h-3 w-3" />,
      text: "Due today",
    },
    nextweek: {
      bg: "bg-blue-500/15 text-blue-300 border-blue-500/20",
      icon: <CalendarDays className="h-3 w-3" />,
      text: `Next week${dueAt ? ` · ${new Date(dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}`,
    },
    none: {
      bg: "bg-muted/50 text-muted-foreground",
      icon: <CalendarDays className="h-3 w-3" />,
      text: dueAt ? new Date(dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No due date",
    },
  };

  const c = configs[category];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${c.bg}`}>
      {c.icon}
      {c.text}
    </span>
  );
}

/* ===== LOADING SKELETON ===== */
function LoadingSkeleton({ viewMode }: { viewMode: "board" | "list" }) {
  if (viewMode === "board") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[0, 1, 2].map((col) => (
          <div key={col} className="flex flex-col">
            <Skeleton className="h-14 w-full rounded-t-2xl" />
            <div className="flex-1 border border-t-0 border-border rounded-b-2xl p-3 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}

/* ===== EMPTY STATE ===== */
function EmptyState({ hasUser }: { hasUser: boolean }) {
  return (
    <Card className="glass rounded-2xl border-border shadow-sm overflow-hidden">
      <div className="px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 border border-border">
          <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          {hasUser ? "All caught up!" : "Sign in to view your tasks"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          {hasUser
            ? "No tasks are assigned to you right now. Tasks assigned to you from any project will appear here."
            : "Sign in to see tasks that have been assigned to you across all your projects."}
        </p>
      </div>
    </Card>
  );
}
