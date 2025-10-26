"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

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

export default function MyTasksPage() {
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [projects, setProjects] = useState<Record<string, ProjectRow>>({});
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<"none" | "project" | "due">("none");

  // No inline assignment controls on this page

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(
          "id, project_id, workspace_id, title, description, status, priority, assignee_id, due_at, created_by, created_at"
        )
        .eq("assignee_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as TaskRow[];
      setTasks(rows);

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
      setLoading(false);
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
    if (userId) load();
  }, [userId, load]);

  const filtered = tasks.filter((t) => {
    const matchesStatus = statusFilter === "all" ? true : (t.status ?? "todo") === statusFilter;
    const q = search.trim().toLowerCase();
    const matchesQuery = !q
      ? true
      : t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
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
    // due date buckets
    const now = new Date();
    const sow = startOfWeek(now);
    const eow = endOfWeek(now);
    const buckets: Record<string, { label: string; tasks: TaskRow[] }> = {
      overdue: { label: "Overdue", tasks: [] },
      today: { label: "Due today", tasks: [] },
      week: { label: "Due this week", tasks: [] },
      later: { label: "Later", tasks: [] },
      none: { label: "No due date", tasks: [] },
    };
    list.forEach((t) => {
      if (!t.due_at) {
        buckets.none.tasks.push(t);
        return;
      }
      const due = new Date(t.due_at);
      const isToday = due.toDateString() === now.toDateString();
      if (due < new Date(now.toDateString())) buckets.overdue.tasks.push(t);
      else if (isToday) buckets.today.tasks.push(t);
      else if (due >= sow && due <= eow) buckets.week.tasks.push(t);
      else buckets.later.tasks.push(t);
    });
    return ["overdue", "today", "week", "later", "none"].map((k) => ({ key: k, label: buckets[k].label, tasks: buckets[k].tasks }));
  };
  const groups = groupTasks(filtered);

  return (
    <div className="min-h-screen pt-12 w-full bg-[radial-gradient(80rem_40rem_at_50%_-10%,rgba(0,0,0,0.06),transparent)]">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-10 py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-neutral-900 tracking-tight">My Tasks</h1>
            <p className="text-sm text-neutral-600 mt-1">All tasks assigned to you across projects.</p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks"
              className="w-64 bg-white text-neutral-900 border-neutral-300 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:border-neutral-400 rounded-xl"
            />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-9 w-[180px] bg-white text-neutral-900 border-neutral-300 rounded-xl">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent className="bg-white text-neutral-900 border-neutral-200">
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="todo">To do</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
              <SelectTrigger className="h-9 w-[180px] bg-white text-neutral-900 border-neutral-300 rounded-xl">
                <SelectValue placeholder="Group by" />
              </SelectTrigger>
              <SelectContent className="bg-white text-neutral-900 border-neutral-200">
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
              <Skeleton key={i} className="h-20 w-full bg-neutral-100 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-700">
            {userId ? "No tasks assigned to you." : "Sign in to view your tasks."}
          </Card>
        ) : (
          <div className="space-y-8">
            {groups.map((g) => (
              <div key={g.key} className="space-y-3">
                {groupBy !== "none" && (
                  <div className="text-sm font-medium text-neutral-700">{g.label}</div>
                )}
                {g.tasks.length === 0 ? (
                  <Card className="rounded-xl border border-neutral-200 bg-white p-4 text-neutral-600">No tasks</Card>
                ) : (
                  <div className="space-y-4">
                    {g.tasks.map((t) => {
                      return (
                        <Card key={t.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-neutral-900 font-medium leading-6">{t.title}</div>
                              {t.description ? (
                                <div className="mt-1 text-sm text-neutral-700 line-clamp-2">{t.description}</div>
                              ) : null}
                              <div className="mt-2 flex items-center gap-2 text-xs text-neutral-600">
                                <Badge variant="outline" className="border-neutral-200 text-neutral-700">
                                  {priorityLabel(t.priority)}
                                </Badge>
                                <Badge variant="outline" className="border-neutral-200 text-neutral-700">
                                  {t.status === "in_progress" ? "In progress" : t.status === "done" ? "Done" : "To do"}
                                </Badge>
                                {projects[t.project_id] ? (
                                  <Link
                                    href={`/projects/${t.project_id}/tasks`}
                                    className="underline underline-offset-2 text-neutral-700 hover:text-neutral-900"
                                  >
                                    {projects[t.project_id]?.name ?? "Project"}
                                  </Link>
                                ) : null}
                                <span className="text-neutral-500">Created {new Date(t.created_at).toLocaleString()}</span>
                              </div>
                            </div>
                            {/* assignment control handled elsewhere */}
                          </div>
                          <Separator className="my-4 bg-neutral-200" />
                          <div className="text-xs text-neutral-500">Task ID: {t.id}</div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
