"use client";

import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  type CSSProperties,
  useRef,
} from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { toast } from "sonner";
import { Pencil, Trash2, Plus, GripVertical, Calendar } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  UniqueIdentifier,
  useSensor,
  useDroppable,
  useDraggable,
  useSensors,
} from "@dnd-kit/core";

/* ==========================================================================
   Inline AssigneeSearchBar for create-only (no per-card dropdown)
   ========================================================================== */

type Candidate = { id: string; label: string };

type SearchBarProps = {
  candidates: Candidate[];
  placeholder?: string;
  /** null = Unassigned, "<id>" = user id */
  value: string | null;
  onChange: (val: string | null) => void;
  allowUnassigned?: boolean;
  className?: string;
};

function AssigneeSearchBar({
  candidates,
  placeholder,
  value,
  onChange,
  allowUnassigned,
  className,
}: SearchBarProps) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reflect external value into the input
  useEffect(() => {
    if (value === null) {
      setQ(allowUnassigned ? "Unassigned" : "");
      return;
    }
    const match = candidates.find((c) => c.id === value);
    setQ(match?.label ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, candidates]);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim().toLowerCase()), 160);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const options = useMemo(() => {
    const filtered = !debounced
      ? candidates.slice(0, 20)
      : candidates
          .filter((c) =>
            c?.label ? c.label.toLowerCase().includes(debounced) : false
          )
          .slice(0, 20);
    return filtered.map((c) => ({ key: c.id, label: c.label, id: c.id }));
  }, [candidates, debounced]);

  useEffect(() => {
    setActiveIndex(0);
  }, [options.length, open]);

  const select = (id: string | null) => {
    onChange(id);
    setOpen(false);
    if (id === null) setQ(allowUnassigned ? "Unassigned" : "");
    else setQ(candidates.find((c) => c.id === id)?.label ?? "");
  };

  return (
    <div ref={boxRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
          className="h-9 rounded-xl bg-white text-neutral-900 border-neutral-300 pr-8"
          aria-autocomplete="list"
          aria-expanded={open}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, options.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
            }
            if (e.key === "Enter") {
              e.preventDefault();
              const opt = options[activeIndex];
              if (opt) select(opt.id);
            }
            if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>

      {open && (
        <div
          role="listbox"
          className="absolute z-20 mt-1 w-full rounded-xl border border-neutral-200 bg-white shadow-lg overflow-hidden"
          onMouseDown={(e) => e.preventDefault()}
        >
          {allowUnassigned && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50"
              onClick={() => select(null)}
            >
              Unassigned
            </button>
          )}
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-neutral-500">No results</div>
          ) : (
            <ul>
              {options.map((opt, i) => (
                <li key={opt.key}>
                  <button
                    type="button"
                    role="option"
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 ${
                      i === activeIndex ? "bg-neutral-50" : ""
                    }`}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => select(opt.id)}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   Helpers: due date categorization
   ========================================================================== */

type DueCategory = "overdue" | "today" | "nextweek" | "none";

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

function dueBadgeClass(cat: DueCategory) {
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
}

function formatDateShort(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

/* ==========================================================================
   Tasks Board Page
   ========================================================================== */

type Status = "todo" | "in_progress" | "done";

export type TaskRow = {
  id: string;
  project_id: string;
  workspace_id?: string | null;
  title: string;
  description?: string | null;
  status: Status;
  priority?: number | null; // 1-5
  assignee_id?: string | null;
  due_at?: string | null;
  created_by: string | null;
  created_at: string;
};

const COLUMNS: Array<{ id: Status; label: string }> = [
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "done", label: "Done" },
];

const statusTint: Record<Status, string> = {
  todo: "from-white to-blue-50/50",
  in_progress: "from-white to-amber-50/50",
  done: "from-white to-emerald-50/50",
};

const priorityClass = (p?: number | null) => {
  switch (p) {
    case 1:
      return "bg-red-50 text-red-700 border-red-200";
    case 2:
      return "bg-orange-50 text-orange-700 border-orange-200";
    case 3:
      return "bg-amber-50 text-amber-700 border-amber-200";
    case 4:
      return "bg-blue-50 text-blue-700 border-blue-200";
    case 5:
      return "bg-purple-50 text-purple-700 border-purple-200";
    default:
      return "bg-neutral-50 text-neutral-700 border-neutral-200";
  }
};

type DueFilter = "all" | DueCategory;

export default function ProjectTasksBoardPage() {
  const { id: projectIdParam } = useParams<{ id: string }>();
  const projectId = projectIdParam as string;
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [createDue, setCreateDue] = useState<string>(""); // yyyy-mm-dd
  const todayStr = useMemo(() => new Date().toISOString().slice(0,10), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [members, setMembers] = useState<Array<{ id: string; email: string }>>([]);
  const [canCreate, setCanCreate] = useState<boolean>(false);
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");

  // Create-time assignee only
  const [createAssigneeId, setCreateAssigneeId] = useState<string | null>(null);

  // Editing state per task
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editDue, setEditDue] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const sortTasks = (arr: TaskRow[]) =>
    arr
      .slice()
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(
          "id, project_id, workspace_id, title, description, status, priority, assignee_id, due_at, created_by, created_at"
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setItems(sortTasks((data ?? []) as TaskRow[]));
    } catch (e: unknown) {
      toast.error(
        (e instanceof Error ? e.message : String(e)) || "Failed to load tasks"
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase]);

  // bootstrap
  useEffect(() => {
    const init = async () => {
      let currentUserId: string | null = null;
      try {
        const { data } = await supabase.auth.getUser();
        currentUserId = data.user?.id ?? null;
        setUserId(currentUserId);
      } catch {}
      await load();

      // load project workspace and its members for assignee picker + role
      try {
        const { data: proj } = await supabase
          .from("projects")
          .select("workspace_id")
          .eq("id", projectId)
          .maybeSingle<{ workspace_id: string }>();

        if (proj?.workspace_id) {
          setWorkspaceId(proj.workspace_id);

          const { data: wms } = await supabase
            .from("workspace_members")
            .select("*")
            .eq("workspace_id", proj.workspace_id);

          const ids = (wms ?? []).map((r: any) => r.user_id as string);
          if (ids.length) {
            // Determine if current user is admin or owner (no await inside .find)
            const me = (wms ?? []).find(
              (r: any) => String(r.user_id) === String(currentUserId)
            );
            setCanCreate(me?.role === "admin" || me?.role === "owner");

            try {
              // Prefer any saved label on workspace_members; fallback to app profiles
              const wmLabelMap: Record<string, string | null> = Object.fromEntries(
                (wms ?? []).map((r: any) => {
                  const uid = String(r.user_id);
                  const primary = (r.member_name as string | null) || (r.name as string | null) || (r.display_name as string | null);
                  const fallback = (r.member_email as string | null) || (r.email as string | null) || null;
                  const label = (primary && String(primary).trim()) || (fallback && String(fallback).trim()) || null;
                  return [uid, label];
                })
              );

              // Try app users.username and display_name
              let userMap: Record<string, { username: string | null; display: string | null }> = {};
              try {
                if (ids.length) {
                  const { data: userProfiles } = await supabase
                    .from("users")
                    .select("id, username, display_name")
                    .in("id", ids);
                  userMap = Object.fromEntries(
                    (userProfiles ?? []).map((u: any) => [
                      String(u.id),
                      {
                        username: (u.username as string | null) ?? null,
                        display: (u.display_name as string | null) ?? null,
                      },
                    ])
                  );
                }
              } catch {
                userMap = {};
              }

              // Prefer profiles.username if available; fallback to profiles.full_name
              let profilesMap: Record<string, { username: string | null; full_name: string | null }> = {};
              try {
                if (ids.length) {
                  const { data: profs } = await supabase
                    .from("profiles")
                    .select("id, username, full_name")
                    .in("id", ids);
                  profilesMap = Object.fromEntries(
                    (profs ?? []).map((p: any) => [
                      String(p.id),
                      {
                        username: (p.username as string | null) ?? null,
                        full_name: (p.full_name as string | null) ?? null,
                      },
                    ])
                  );
                }
              } catch {}

              setMembers(
                ids.map((id) => {
                  const label =
                    // Prefer explicit usernames first
                    (profilesMap[id]?.username?.trim()) ||
                    (userMap[id]?.username?.trim()) ||
                    // Then any workspace-provided label
                    (wmLabelMap[id]?.trim()) ||
                    // Then other names
                    (userMap[id]?.display?.trim()) ||
                    (profilesMap[id]?.full_name?.trim()) ||
                    null;
                  return { id, email: label || "User" };
                })
              );
            } catch {
              setMembers([]);
            }
          } else {
            setMembers([]);
          }
        }
      } catch {}
    };
    init();
  }, [supabase, load, projectId]);

  // realtime
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`tasks-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${projectId}` },
        (payload) => {
          const type = payload.eventType;
          const row = type === "DELETE" ? (payload.old as TaskRow) : (payload.new as TaskRow);
          if (!row) return;
          setItems((cur) => {
            if (type === "INSERT") {
              const exists = cur.some((t) => t.id === row.id);
              const next = exists ? cur.map((t) => (t.id === row.id ? row : t)) : [...cur, row];
              return sortTasks(next);
            }
            if (type === "UPDATE") {
              return sortTasks(cur.map((t) => (t.id === row.id ? row : t)));
            }
            if (type === "DELETE") {
              return cur.filter((t) => t.id !== row.id);
            }
            return cur;
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, projectId]);

  // CRUD helpers --------------------------------------------------------------
  const createTask = async (title: string, initialAssigneeId: string | null, dueLocal: string) => {
    if (!canCreate) {
      toast.error("Only owners/admins can add tasks.");
      throw new Error("not_allowed");
    }
    const due_at = dueLocal ? new Date(dueLocal).toISOString() : null;
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        title: title.trim(),
        status: "todo",
        created_by: userId,
        assignee_id: initialAssigneeId,
        due_at,
      })
      .select(
        "id, project_id, workspace_id, title, description, status, priority, assignee_id, due_at, created_by, created_at"
      )
      .single<TaskRow>();
    if (error) throw error;
    try {
      const actor = (await supabase.auth.getUser()).data.user?.id ?? 'system'
      // Assignee notification (fanout)
      if (data?.assignee_id && data.assignee_id !== userId) {
        await fetch('/api/notifications/fanout', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'task_assigned',
            actorId: actor,
            recipients: [data.assignee_id],
            workspaceId: data.workspace_id ?? workspaceId ?? null,
            projectId: data.project_id,
            taskId: data.id,
            meta: { task_title: data.title },
          }),
        })
      }
      // Unassigned → notify admins/owners
      const wsId = data?.workspace_id ?? workspaceId ?? null
      if (wsId && !data?.assignee_id) {
        const { data: admins } = await supabase
          .from('workspace_members')
          .select('user_id, role')
          .eq('workspace_id', wsId)
          .in('role', ['owner', 'admin'] as any)
        const recipients = (admins ?? [])
          .map((r: any) => String(r.user_id))
          .filter((uid) => uid && uid !== userId)
        if (recipients.length) {
          await fetch('/api/notifications/fanout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'task_created', actorId: actor, recipients, workspaceId: wsId, projectId: data.project_id, taskId: data.id, meta: { task_title: data.title } }) })
        }
      }
    } catch {}
    return data;
  };

  const updateTask = async (id: string, patch: Partial<TaskRow>) => {
    try {
      const prev = items.find((t) => t.id === id) || null;
      const { data, error } = await supabase
        .from("tasks")
        .update(patch)
        .eq("id", id)
        .select(
          "id, project_id, workspace_id, title, description, status, priority, assignee_id, due_at, created_by, created_at"
        )
        .single<TaskRow>();
      if (error) throw error;
      setItems((cur) => cur.map((t) => (t.id === id ? data : t)));
      // Notify on status change (fanout)
      if (prev && typeof patch.status !== "undefined" && prev.status !== data.status) {
        const actor = (await supabase.auth.getUser()).data.user?.id ?? "system";
        const recipients = new Set<string>();
        if (data.assignee_id && data.assignee_id !== actor) recipients.add(data.assignee_id);
        if (data.created_by && data.created_by !== actor) recipients.add(data.created_by);
        if (recipients.size) {
          try {
            await fetch('/api/notifications/fanout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'task_update', actorId: actor, recipients: Array.from(recipients), workspaceId: data.workspace_id ?? workspaceId ?? null, projectId: data.project_id, taskId: data.id, meta: { task_title: data.title } }) })
          } catch {}
        }
      }
    } catch (e: unknown) {
      const msg =
        (e instanceof Error ? e.message : String(e)) || "Failed to update task";
      if (
        msg.toLowerCase().includes("permission") ||
        msg.toLowerCase().includes("not allowed")
      ) {
        toast.error("Not allowed");
      } else {
        toast.error(msg);
      }
      throw e;
    }
  };

  const deleteTask = async (id: string) => {
    setDeleting(true);
    try {
      const target = items.find((t) => t.id === id);
      if (target && target.created_by !== userId) {
        toast.error("Only the creator can delete this task.");
        return;
      }
      // optimistic remove
      const prev = items;
      setItems((cur) => cur.filter((t) => t.id !== id));
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) {
        setItems(prev); // revert
        throw error;
      }
      toast.success("Task deleted");
    } catch (e: unknown) {
      const msg =
        (e instanceof Error ? e.message : String(e)) || "Failed to delete task";
      if (
        msg.toLowerCase().includes("permission") ||
        msg.toLowerCase().includes("not allowed")
      ) {
        toast.error("Not allowed");
      } else {
        toast.error(msg);
      }
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setPendingDeleteId(null);
    }
  };

  // DnD handlers (assignee-only) ----------------------------------------------
  const onDragStart = (evt: DragStartEvent) => {
    const draggedId = evt.active.id as string;
    const t = items.find((x) => x.id === draggedId);
    if (!t || t.assignee_id !== userId) return; // only current assignee can drag
    setActiveId(evt.active.id);
  };

  const onDragEnd = async (evt: DragEndEvent) => {
    const overId = evt.over?.id as string | undefined;
    const draggedId = evt.active.id as string;
    setActiveId(null);
    if (!overId) return;

    const prev = items.find((t) => t.id === draggedId);
    if (!prev || prev.assignee_id !== userId) return; // only assignee can move

    // Droppable ids are "column:<status>"
    const [, target] = overId.split(":");
    if (!target || !["todo", "in_progress", "done"].includes(target)) return;

    const nextStatus = target as Status;
    if (prev.status === nextStatus) return;

    // optimistic update
    setItems((cur) => cur.map((t) => (t.id === draggedId ? { ...t, status: nextStatus } : t)));
    try {
      await updateTask(draggedId, { status: nextStatus });
    } catch {
      // revert on failure
      setItems((cur) => cur.map((t) => (t.id === draggedId ? { ...t, status: prev.status } : t)));
    }
  };

  // UI helpers ----------------------------------------------------------------
  const submitNew = async () => {
    if (!canCreate) {
      toast.error("Only owners/admins can add tasks.");
      return;
    }
    const title = newTitle.trim();
    if (!title) return;
    const initialAssigneeId = createAssigneeId ?? null;
    // Use date input value directly; quick-due select already maps into createDue
    const dueLocal = createDue; // yyyy-mm-dd or empty
    setNewTitle("");
    setCreateAssigneeId(null);

    // optimistic temp row
    const tempId = `temp-${Date.now()}`;
    const optimistic: TaskRow = {
      id: tempId,
      project_id: projectId,
      workspace_id: workspaceId,
      title,
      description: null,
      status: "todo",
      priority: null,
      assignee_id: initialAssigneeId,
      due_at: dueLocal ? new Date(dueLocal).toISOString() : null,
      created_by: userId,
      created_at: new Date().toISOString(),
    };
    setItems((cur) => sortTasks([...cur, optimistic]));

    try {
      const created = await createTask(title, initialAssigneeId, dueLocal);
      // swap temp with real; also dedupe in case realtime already added the real row
      setItems((cur) => {
        const without = cur.filter((t) => t.id !== tempId && t.id !== created.id);
        return sortTasks([...without, created]);
      });
      toast.success("Task created");
    } catch (e) {
      // remove temp row
      setItems((cur) => cur.filter((t) => t.id !== tempId));
      if ((e as Error)?.message !== "not_allowed") {
        toast.error(e instanceof Error ? e.message : "Failed to create task");
      }
    }
  };

  const startEdit = (t: TaskRow) => {
    if (t.created_by !== userId) {
      toast.error("Only the creator can edit this task.");
      return;
    }
    setEditingId(t.id);
    setEditTitle(t.title);
    setEditDescription(t.description ?? "");
    setEditDue(t.due_at ? new Date(t.due_at).toISOString().slice(0, 10) : "");
  };

  // Make save optimistic for instant feedback (includes due date)
  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    const prev = items.find((t) => t.id === id);
    if (prev && prev.created_by !== userId) {
      toast.error("Only the creator can edit this task.");
      setSavingEdit(false);
      return;
    }

    const patch: Partial<TaskRow> = {
      title: editTitle.trim() || "Untitled",
      description: editDescription.trim() || null,
      due_at: editDue ? new Date(editDue).toISOString() : null,
    };

    // optimistic
    setItems((cur) => cur.map((t) => (t.id === id ? { ...t, ...patch } : t)));

    try {
      await updateTask(id, patch);
      setEditingId(null);
    } catch {
      // revert on failure
      if (prev) {
        setItems((cur) => cur.map((t) => (t.id === id ? prev : t)));
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = (id: string) => {
    setPendingDeleteId(id);
    setDeleteOpen(true);
  };

  // search-bar candidates
  const filterCandidates = members.map((m) => ({ id: m.id, label: m.email ?? "" }));

  // derive filtered items by due category
  const filteredItems = useMemo(() => {
    if (dueFilter === "all") return items;
    return items.filter((t) => dueCategory(t.due_at) === dueFilter);
  }, [items, dueFilter]);

  return (
    <div className="min-h-screen pt-12 w-full bg-[radial-gradient(80rem_40rem_at_50%_-10%,rgba(0,0,0,0.06),transparent)]">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-10 py-10">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {canCreate && (
            <Card className="w-full p-3 rounded-xl border border-neutral-200 shadow-sm">
              <div className="flex items-end gap-3 flex-wrap">
                <div className="flex flex-col">
                  <label className="text-xs text-neutral-600 mb-1">Task title</label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitNew();
                    }}
                    placeholder="Quick add a task..."
                    aria-label="New task title"
                    className="w-72 bg-white text-neutral-900 border-neutral-300 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:border-neutral-400 rounded-xl"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-xs text-neutral-600 mb-1">Assign to</label>
                  <AssigneeSearchBar
                    candidates={filterCandidates}
                    value={createAssigneeId}
                    onChange={(val) => setCreateAssigneeId(val)}
                    allowUnassigned
                    placeholder="Assign to..."
                    className="w-56"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <label className="text-xs text-neutral-600 mb-1">Quick due</label>
                    <select
                      className="h-9 rounded-xl border border-neutral-300 bg-white text-neutral-900 px-2"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "today") {
                          setCreateDue(todayStr);
                        } else if (val === "nextweek") {
                          const d = new Date();
                          d.setDate(d.getDate() + 7);
                          setCreateDue(d.toISOString().slice(0,10));
                        } else if (val === "none") {
                          setCreateDue("");
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Quick due...</option>
                      <option value="today">Today</option>
                      <option value="nextweek">Next week</option>
                      <option value="none">No due date</option>
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-neutral-600 mb-1">Date</label>
                    <Input
                      type="date"
                      min={todayStr}
                      value={createDue}
                      onChange={(e) => setCreateDue(e.target.value)}
                      className="h-9 w-44 rounded-xl bg-white text-neutral-900 border-neutral-300"
                    />
                  </div>
                </div>

                <Button
                  onClick={submitNew}
                  disabled={creating}
                  className="rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-900 shadow-sm"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
              </div>
            </Card>
          )}

          {/* Due filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-600">Filter:</span>
            <select
              value={dueFilter}
              onChange={(e) => setDueFilter(e.target.value as DueFilter)}
              className="h-9 rounded-xl border border-neutral-300 bg-white text-neutral-900 px-2"
            >
              <option value="all">All</option>
              <option value="today">Due today</option>
              <option value="nextweek">Next week</option>
              <option value="none">No due date</option>
            </select>
          </div>
        </div>

        {/* Board */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {COLUMNS.map((c) => (
              <Card
                key={c.id}
                className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="text-neutral-900 font-medium">{c.label}</div>
                  <Badge variant="outline" className="border-neutral-200 text-neutral-600">
                    ...
                  </Badge>
                </div>
                <Separator className="my-3 bg-neutral-200" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full bg-neutral-100 rounded-xl" />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {COLUMNS.map((col) => (
                <Column
                  key={col.id}
                  columnId={col.id}
                  label={col.label}
                  tasks={filteredItems.filter((t) => (t.status ?? "todo") === col.id)}
                  onEdit={startEdit}
                  onDelete={confirmDelete}
                  editingId={editingId}
                  editTitle={editTitle}
                  setEditTitle={setEditTitle}
                  editDescription={editDescription}
                  setEditDescription={setEditDescription}
                  editDue={editDue}
                  setEditDue={setEditDue}
                  onSaveEdit={saveEdit}
                  savingEdit={savingEdit}
                  onChangePriority={async (id, value) => {
                    const prev = items.find((t) => t.id === id);
                    if (!prev || prev.created_by !== userId) {
                      toast.error("Only the creator can change priority.");
                      return;
                    }
                    // optimistic priority
                    setItems((cur) => cur.map((t) => (t.id === id ? { ...t, priority: value } : t)));
                    try {
                      await updateTask(id, { priority: value });
                    } catch {
                      setItems((cur) =>
                        cur.map((t) => (t.id === id ? { ...t, priority: prev?.priority ?? null } : t))
                      );
                    }
                  }}
                  members={members}
                  currentUserId={userId}
                  todayStr={todayStr}
                />
              ))}
            </div>
          </DndContext>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => pendingDeleteId && deleteTask(pendingDeleteId)}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ----------------------- Column (droppable) ----------------------- */

interface ColumnProps {
  columnId: Status;
  label: string;
  tasks: TaskRow[];
  onEdit: (t: TaskRow) => void;
  onDelete: (id: string) => void;
  onChangePriority: (id: string, value: number | null) => void;
  editingId: string | null;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editDescription: string;
  setEditDescription: (v: string) => void;
  editDue: string;
  setEditDue: (v: string) => void;
  onSaveEdit: (id: string) => void;
  savingEdit: boolean;
  members: Array<{ id: string; email: string }>;
  currentUserId: string | null;
  todayStr: string;
}

function Column(props: ColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: `column:${props.columnId}` });

  return (
    <Card
      ref={setNodeRef as unknown as (instance: HTMLDivElement | null) => void}
      className={`group overflow-hidden rounded-2xl border border-neutral-200 shadow-sm transition-all ${
        isOver ? "ring-2 ring-neutral-300" : "ring-0"
      }`}
    >
      {/* tinted header */}
      <div
        className={`sticky top-0 z-10 -mb-1 bg-gradient-to-b ${statusTint[props.columnId]} px-4 pt-3 pb-2 border-b border-neutral-200`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-neutral-900 font-medium">{props.label}</div>
          <Badge
            variant="outline"
            className="border-neutral-200 text-neutral-700 bg-white/70 backdrop-blur"
          >
            {props.tasks.length}
          </Badge>
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-3 max-h-[70vh] overflow-auto pr-1">
          {props.tasks.length === 0 ? (
            <div className="text-sm text-neutral-500 py-6 text-center border border-dashed border-neutral-200 rounded-xl">
              Drop tasks here
            </div>
          ) : (
            props.tasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onEdit={() => props.onEdit(t)}
                onDelete={() => props.onDelete(t.id)}
                onChangePriority={(v) => props.onChangePriority(t.id, v)}
                isEditing={props.editingId === t.id}
                editTitle={props.editTitle}
                setEditTitle={props.setEditTitle}
                editDescription={props.editDescription}
                setEditDescription={props.setEditDescription}
                editDue={props.editDue}
                setEditDue={props.setEditDue}
                onSave={() => props.onSaveEdit(t.id)}
                saving={props.savingEdit}
                members={props.members}
                currentUserId={props.currentUserId}
                todayStr={props.todayStr}
              />
            ))
          )}
        </div>
      </div>
    </Card>
  );
}

/* ----------------------- Task card (draggable) ----------------------- */

interface TaskCardProps {
  task: TaskRow;
  onEdit: () => void;
  onDelete: () => void;
  onChangePriority: (value: number | null) => void;
  isEditing: boolean;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editDescription: string;
  setEditDescription: (v: string) => void;
  editDue: string;
  setEditDue: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  members: Array<{ id: string; email: string }>;
  currentUserId: string | null;
  todayStr: string;
}

function TaskCard(props: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: props.task.id,
  });

  const style: CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const priorityValue = props.task.priority ? String(props.task.priority) : "none";
  const canEditPriority = !!props.currentUserId && props.currentUserId === props.task.created_by;
  const canEditDelete = !!props.currentUserId && props.currentUserId === props.task.created_by;

  const assigneeLabel = props.task.assignee_id
    ? props.members.find((m) => m.id === props.task.assignee_id)?.email ?? "User"
    : "Unassigned";

  const cat = dueCategory(props.task.due_at);
  const dueClass = dueBadgeClass(cat);
  const dueText =
    cat === "overdue"
      ? "Overdue"
      : cat === "today"
      ? "Due today"
      : cat === "nextweek"
      ? "Next week"
      : "No due date";

  return (
    <div
      ref={setNodeRef}
      style={style as CSSProperties}
      {...listeners}
      {...attributes}
      className={`rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors p-3 shadow-sm hover:shadow-md focus-visible:ring-2 focus-visible:ring-neutral-300 outline-none ${
        isDragging ? "opacity-70" : ""
      }`}
    >
      {!props.isEditing ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 cursor-grab active:cursor-grabbing">
                <GripVertical className="h-3.5 w-3.5" />
              </span>
              <div>
                <div className="text-neutral-900 font-medium leading-5 line-clamp-2">
                  {props.task.title}
                </div>
                {props.task.description ? (
                  <div className="mt-1 text-sm text-neutral-700 line-clamp-3">
                    {props.task.description}
                  </div>
                ) : null}

                {/* Assignee text only */}
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-700">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback>
                      {assigneeLabel[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-[180px] truncate">{assigneeLabel}</span>
                </div>
              </div>
            </div>

            {canEditDelete ? (
              <div className="flex items-center gap-2">
                <button
                  aria-label="Edit task"
                  className="text-neutral-600 hover:text-neutral-900"
                  onClick={props.onEdit}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  aria-label="Delete task"
                  className="text-neutral-600 hover:text-neutral-900"
                  onClick={props.onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex items-center flex-wrap gap-2 text-xs text-neutral-600">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${priorityClass(
                props.task.priority
              )}`}
            >
              <span className="font-medium">Priority</span>
              {canEditPriority ? (
                <select
                  value={priorityValue}
                  onChange={(e) =>
                    props.onChangePriority(
                      e.target.value === "none" ? null : Number(e.target.value)
                    )
                  }
                  className="h-6 w-[110px] border-0 bg-transparent text-current px-1 focus:outline-none"
                >
                  <option value="none">None</option>
                  <option value="1">P1</option>
                  <option value="2">P2</option>
                  <option value="3">P3</option>
                  <option value="4">P4</option>
                  <option value="5">P5</option>
                </select>
              ) : (
                <span className="px-1">{priorityValue === "none" ? "None" : `P${priorityValue}`}</span>
              )}
            </span>

            {/* Due badge */}
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${dueClass}`}>
              <span className="font-medium">{dueText}</span>
              {props.task.due_at ? (
                <span className="opacity-80">({formatDateShort(props.task.due_at)})</span>
              ) : null}
            </span>

            <span className="text-neutral-500">
              Created {new Date(props.task.created_at).toLocaleString()}
            </span>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Input
            value={props.editTitle}
            onChange={(e) => props.setEditTitle(e.target.value)}
            className="bg-white text-neutral-900 border-neutral-300 focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:border-neutral-300 rounded-lg"
          />
          <Textarea
            value={props.editDescription}
            onChange={(e) => props.setEditDescription(e.target.value)}
            rows={3}
            className="bg-white text-neutral-900 border-neutral-300 focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:border-neutral-300 rounded-lg"
          />
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-neutral-500" />
            <select
              className="h-9 rounded-xl border border-neutral-300 bg-white text-neutral-900 px-2"
              onChange={(e) => {
                const val = e.target.value;
                  if (val === "today") {
                    const t = new Date().toISOString().slice(0,10);
                    props.setEditDue(t);
                  } else if (val === "nextweek") {
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    props.setEditDue(d.toISOString().slice(0,10));
                  } else if (val === "none") {
                    props.setEditDue("");
                  }
              }}
              defaultValue=""
            >
              <option value="" disabled>Quick due...</option>
              <option value="today">Today</option>
              <option value="nextweek">Next week</option>
              <option value="none">No due date</option>
            </select>
              <Input
                type="date"
              min={props.todayStr}
              value={props.editDue}
              onChange={(e) => props.setEditDue(e.target.value)}
              className="h-9 w-44 rounded-lg bg-white text-neutral-900 border-neutral-300"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={props.onSave} disabled={props.saving} className="rounded-lg">
              {props.saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
