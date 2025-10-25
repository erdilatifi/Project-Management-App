"use client";

import { useEffect, useMemo, useState, useCallback, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, GripVertical } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";

type Status = "todo" | "in_progress" | "done";

export type TaskRow = {
  id: string;
  project_id: string;
  workspace_id?: string | null;
  title: string;
  description?: string | null;
  status: Status;
  priority?: number | null; // 1–5
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

// subtle column tints
const statusTint: Record<Status, string> = {
  todo: "from-white to-blue-50/50",
  in_progress: "from-white to-amber-50/50",
  done: "from-white to-emerald-50/50",
};

// pill colors by priority
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

export default function ProjectTasksBoardPage() {
  const { id: projectIdParam } = useParams<{ id: string }>();
  const projectId = projectIdParam as string;
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // Editing state per task
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const sortTasks = (arr: TaskRow[]) =>
    arr.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

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
      toast.error((e instanceof Error ? e.message : String(e)) || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase]);

  // bootstrap
  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setUserId(data.user?.id ?? null);
      } catch {}
      await load();
    };
    init();
  }, [supabase, load]);

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
          const row = (type === "DELETE" ? (payload.old as TaskRow) : (payload.new as TaskRow));
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

  const createTask = async (title: string) => {
    if (!userId) {
      toast.error("You must be signed in");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert({ project_id: projectId, title: title.trim(), status: "todo", created_by: userId })
        .select(
          "id, project_id, workspace_id, title, description, status, priority, assignee_id, due_at, created_by, created_at"
        )
        .single<TaskRow>();
      if (error) throw error;
      setItems((cur) => sortTasks([...cur, data]));
      toast.success("Task created");
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const updateTask = async (id: string, patch: Partial<TaskRow>) => {
    try {
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
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Failed to update task");
      throw e;
    }
  };

  const deleteTask = async (id: string) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      setItems((cur) => cur.filter((t) => t.id !== id));
      toast.success("Task deleted");
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Failed to delete task");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setPendingDeleteId(null);
    }
  };

  // DnD handlers --------------------------------------------------------------
  const onDragStart = (evt: DragStartEvent) => {
    setActiveId(evt.active.id);
  };

  const onDragEnd = async (evt: DragEndEvent) => {
    const overId = evt.over?.id as string | undefined;
    const draggedId = evt.active.id as string;
    setActiveId(null);
    if (!overId) return;
    const [, target] = overId.split(":");
    if (!target || !["todo", "in_progress", "done"].includes(target)) return;
    const nextStatus = target as Status;
    const prev = items.find((t) => t.id === draggedId);
    if (!prev || prev.status === nextStatus) return;

    // optimistic update
    setItems((cur) => cur.map((t) => (t.id === draggedId ? { ...t, status: nextStatus } : t)));
    try {
      await updateTask(draggedId, { status: nextStatus });
    } catch {
      // revert on failure
      setItems((cur) => cur.map((t) => (t.id === draggedId ? { ...t, status: prev.status } : t)));
    }
  };

  const onChangePriority = async (id: string, value: number | null) => {
    const prev = items.find((t) => t.id === id);
    setItems((cur) => cur.map((t) => (t.id === id ? { ...t, priority: value } : t)));
    try {
      await updateTask(id, { priority: value });
    } catch {
      setItems((cur) => cur.map((t) => (t.id === id ? { ...t, priority: prev?.priority ?? null } : t)));
    }
  };

  // UI helpers ----------------------------------------------------------------
  const submitNew = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    await createTask(title);
  };

  const startEdit = (t: TaskRow) => {
    setEditingId(t.id);
    setEditTitle(t.title);
    setEditDescription(t.description ?? "");
  };

  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    try {
      await updateTask(id, {
        title: editTitle.trim() || "Untitled",
        description: editDescription.trim() || null,
      });
      setEditingId(null);
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = (id: string) => {
    setPendingDeleteId(id);
    setDeleteOpen(true);
  };

  return (
    <div className="min-h-screen pt-12 w-full bg-[radial-gradient(80rem_40rem_at_50%_-10%,rgba(0,0,0,0.06),transparent)]">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-10 py-10">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-neutral-900 tracking-tight">Project Tasks</h1>
            <p className="text-sm text-neutral-600 mt-1">Drag cards between columns to update status.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNew();
              }}
              placeholder="Quick add a task…"
              aria-label="New task title"
              className="w-72 bg-white text-neutral-900 border-neutral-300 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:border-neutral-400 rounded-xl"
            />
            <Button
              onClick={submitNew}
              disabled={creating}
              className="rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-900 shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" /> Add
            </Button>
          </div>
        </div>

        {/* Board */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {COLUMNS.map((c) => (
              <Card key={c.id} className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-neutral-900 font-medium">{c.label}</div>
                  <Badge variant="outline" className="border-neutral-200 text-neutral-600">
                    …
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
                  tasks={items.filter((t) => (t.status ?? "todo") === col.id)}
                  onEdit={startEdit}
                  onDelete={confirmDelete}
                  editingId={editingId}
                  editTitle={editTitle}
                  setEditTitle={setEditTitle}
                  editDescription={editDescription}
                  setEditDescription={setEditDescription}
                  onSaveEdit={saveEdit}
                  savingEdit={savingEdit}
                  onChangePriority={onChangePriority}
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
            <DialogDescription>Are you sure you want to delete this task? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => pendingDeleteId && deleteTask(pendingDeleteId)} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
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
  onSaveEdit: (id: string) => void;
  savingEdit: boolean;
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
          <Badge variant="outline" className="border-neutral-200 text-neutral-700 bg-white/70 backdrop-blur">
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
                onSave={() => props.onSaveEdit(t.id)}
                saving={props.savingEdit}
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
  onSave: () => void;
  saving: boolean;
}

function TaskCard(props: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: props.task.id });
  const style: CSSProperties =
    transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  const priorityValue = props.task.priority ? String(props.task.priority) : "none";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-xl border border-neutral-200  bg-white hover:bg-neutral-50 transition-colors p-3 shadow-sm hover:shadow-md focus-visible:ring-2 focus-visible:ring-neutral-300 outline-none ${isDragging ? "opacity-70" : ""}`}
    >
      {!props.isEditing ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 cursor-grab active:cursor-grabbing">
                <GripVertical className="h-3.5 w-3.5" />
              </span>
              <div>
                <div className="text-neutral-900 font-medium leading-5 line-clamp-2">{props.task.title}</div>
                {props.task.description ? (
                  <div className="mt-1 text-sm text-neutral-700 line-clamp-3">{props.task.description}</div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button aria-label="Edit task" className="text-neutral-600 hover:text-neutral-900" onClick={props.onEdit}>
                <Pencil className="h-4 w-4" />
              </button>
              <button aria-label="Delete task" className="text-neutral-600 hover:text-neutral-900" onClick={props.onDelete}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center flex-wrap gap-2 text-xs text-neutral-600">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${priorityClass(props.task.priority)}`}>
              <span className="font-medium">Priority</span>
              <Select
                value={priorityValue}
                onValueChange={(v) => props.onChangePriority(v === "none" ? null : Number(v))}
              >
                <SelectTrigger className="h-6 w-[110px] border-transparent bg-transparent text-current px-1 focus-visible:ring-0 focus:outline-none">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent className="bg-white text-neutral-900 border-neutral-200">
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="1">P1</SelectItem>
                  <SelectItem value="2">P2</SelectItem>
                  <SelectItem value="3">P3</SelectItem>
                  <SelectItem value="4">P4</SelectItem>
                  <SelectItem value="5">P5</SelectItem>
                </SelectContent>
              </Select>
            </span>

            <span className="text-neutral-500">Created {new Date(props.task.created_at).toLocaleString()}</span>
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
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={props.onSave} disabled={props.saving} className="rounded-lg">
              {props.saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
