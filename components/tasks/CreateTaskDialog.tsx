"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Plus, X, Calendar, Flag, Users as UsersIcon } from "lucide-react";

type User = {
  id: string;
  email: string;
  name?: string;
};

type CreateTaskDialogProps = {
  projectId: string;
  workspaceId?: string;
  onTaskCreated?: (task: any) => void;
  trigger?: React.ReactNode;
};

export function CreateTaskDialog({
  projectId,
  workspaceId,
  onTaskCreated,
  trigger,
}: CreateTaskDialogProps) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<number>(3);
  const [dueDate, setDueDate] = useState(""); // yyyy-mm-dd
  const [quickDue, setQuickDue] = useState<string>("");
  const [selectedAssignees, setSelectedAssignees] = useState<User[]>([]);
  
  // User search
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load workspace members
  useEffect(() => {
    if (!open || !workspaceId) return;
    
    const loadUsers = async () => {
      try {
        const { data: wms, error } = await supabase
          .from("workspace_members")
          .select("*")
          .eq("workspace_id", workspaceId);
        
        if (error) {
          console.error("Error loading workspace members:", error);
          return;
        }
        
        if (!wms?.length) {
          setUsers([]);
          return;
        }
        
        const ids = wms.map((r: any) => r.user_id as string);
        
        // Build user label map
        const wmLabelMap: Record<string, string | null> = Object.fromEntries(
          wms.map((r: any) => {
            const uid = String(r.user_id);
            const primary = (r.member_name as string | null) || (r.name as string | null) || (r.display_name as string | null);
            const fallback = (r.member_email as string | null) || (r.email as string | null) || null;
            const label = (primary && String(primary).trim()) || (fallback && String(fallback).trim()) || null;
            return [uid, label];
          })
        );
        
        // Fetch profile data
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
        
        const userList: User[] = wms.map((wm: any) => {
          const id = String(wm.user_id);
          
          // Get name with fallback chain (workspace_members first, then profiles)
          const name =
            (wm.member_name as string | null)?.trim() ||
            (profilesMap[id]?.username?.trim()) ||
            (profilesMap[id]?.full_name?.trim()) ||
            (wm.member_email as string | null)?.trim() ||
            "Unknown User";
          
          // Get email from workspace_members
          const email = (wm.member_email as string | null)?.trim() || "no-email@example.com";
          
          return {
            id,
            email,
            name,
          };
        });
        
        // Successfully loaded users
        setUsers(userList);
      } catch (error) {
        console.error("Failed to load users:", error);
        setUsers([]);
      }
    };
    
    loadUsers();
  }, [open, workspaceId, supabase]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    if (showUserDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showUserDropdown]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(query) ||
        u.name?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const availableUsers = useMemo(() => {
    const selectedIds = new Set(selectedAssignees.map((u) => u.id));
    return filteredUsers.filter((u) => !selectedIds.has(u.id));
  }, [filteredUsers, selectedAssignees]);

  const addAssignee = (user: User) => {
    setSelectedAssignees((prev) => [...prev, user]);
    setSearchQuery("");
    // Keep dropdown open for adding more users
    setTimeout(() => setShowUserDropdown(true), 100);
  };

  const removeAssignee = (userId: string) => {
    setSelectedAssignees((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Task title is required");
      return;
    }
    
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;
      
      // Create task with ISO date
      const dueISO = dueDate ? new Date(`${dueDate}T00:00:00`).toISOString() : null;

      const assigneeIds = selectedAssignees.map(a => a.id);
      const primaryAssignee = assigneeIds.length > 0 ? assigneeIds[0] : null;
      
      console.log('Creating task with assignee_id:', primaryAssignee, 'assignee_ids:', assigneeIds);
      
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          project_id: projectId,
          workspace_id: workspaceId,
          title: title.trim(),
          description: description.trim() || null,
          priority,
          due_at: dueISO,
          status: "todo",
          created_by: userId,
          assignee_id: primaryAssignee,
          assignee_ids: assigneeIds,
        })
        .select()
        .single();
      
      if (taskError) {
        console.error('Task creation error:', taskError);
        throw taskError;
      }
      
      console.log('Task created successfully:', task);
      
      // Send notifications to all assigned users
      if (assigneeIds.length > 0) {
        try {
          const recipients = assigneeIds.filter(id => id !== userId);
          if (recipients.length > 0) {
            await fetch('/api/notifications/fanout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'task_assigned',
                actorId: userId,
                recipients: recipients,
                workspaceId: workspaceId,
                projectId: projectId,
                taskId: task.id,
                meta: { task_title: task.title },
              }),
            });
            console.log('Notifications sent to:', recipients);
          }
        } catch (error) {
          console.error('Failed to send notifications:', error);
        }
      }
      
      toast.success("Task created successfully!");
      onTaskCreated?.(task);
      
      // Reset form
      setTitle("");
      setDescription("");
      setPriority(3);
      setDueDate("");
      setQuickDue("");
      setSelectedAssignees([]);
      setOpen(false);
    } catch (error: any) {
      console.error("Failed to create task:", error);
      toast.error(error.message || "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  const priorityOptions = [
    { value: 1, label: "Critical", color: "from-red-500/30 to-red-500/10" },
    { value: 2, label: "High", color: "from-orange-500/30 to-orange-500/10" },
    { value: 3, label: "Medium", color: "from-yellow-500/30 to-yellow-500/10" },
    { value: 4, label: "Low", color: "from-green-500/30 to-green-500/10" },
    { value: 5, label: "Trivial", color: "from-blue-500/30 to-blue-500/10" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="rounded-xl shadow-lg hover:shadow-xl transition-all">
            <Plus className="mr-2 h-4 w-4" /> New Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] rounded-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task to your project. Assign it to team members and set priorities.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-semibold">
                Task Title *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Design new landing page"
                className="rounded-xl"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details about this task..."
                rows={4}
                className="rounded-xl resize-none"
              />
            </div>

            {/* Priority & Due Date Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Flag className="h-4 w-4" /> Priority
                </Label>
                <div className="grid grid-cols-5 gap-1 p-1 bg-muted rounded-xl">
                  {priorityOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPriority(option.value)}
                      className={`
                        relative px-2 py-1.5 rounded-lg text-xs font-medium transition-all
                        ${priority === option.value
                          ? `bg-gradient-to-r ${option.color} ring-2 ring-primary/50 shadow-md`
                          : "hover:bg-accent"
                        }
                      `}
                      title={option.label}
                    >
                      {option.value}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {priorityOptions.find((p) => p.value === priority)?.label}
                </p>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="dueDate" className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Due Date
                </Label>
                <div className="flex gap-2">
                  <select
                    className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground"
                    value={quickDue}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuickDue(val);
                      if (val === "today") {
                        const today = new Date();
                        setDueDate(today.toISOString().slice(0, 10));
                      } else if (val === "nextweek") {
                        const d = new Date();
                        d.setDate(d.getDate() + 7);
                        setDueDate(d.toISOString().slice(0, 10));
                      } else if (val === "none") {
                        setDueDate("");
                      }
                    }}
                  >
                    <option value="" disabled>
                      Quick due...
                    </option>
                    <option value="today">Today</option>
                    <option value="nextweek">Next week</option>
                    <option value="none">No due date</option>
                  </select>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      setQuickDue("");
                    }}
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Assignees */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <UsersIcon className="h-4 w-4" /> Assign To
              </Label>
              
              {/* Selected Assignees */}
              {selectedAssignees.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedAssignees.map((user) => (
                    <Badge
                      key={user.id}
                      variant="secondary"
                      className="pl-2 pr-1 py-1 rounded-lg flex items-center gap-2"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs">
                          {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{user.name || user.email}</span>
                      <button
                        type="button"
                        onClick={() => removeAssignee(user.id)}
                        className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* User Search */}
              <div className="relative" ref={searchRef}>
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowUserDropdown(true);
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  placeholder="Search team members..."
                  className="rounded-xl"
                />
                
                {/* Dropdown */}
                {showUserDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-auto">
                  {availableUsers.length > 0 ? (
                    availableUsers.slice(0, 10).map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => addAssignee(user)}
                        className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-center gap-3"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{user.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                        </div>
                      </button>
                    ))
                  ) : searchQuery.trim() ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No users found matching "{searchQuery}"
                    </div>
                  ) : users.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No team members in workspace
                    </div>
                  ) : selectedAssignees.length === users.length ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      All team members already assigned to this task
                    </div>
                  ) : (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Start typing to search...
                    </div>
                  )}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedAssignees.length === 0
                  ? "No assignees yet. Search to add team members."
                  : `${selectedAssignees.length} assignee${selectedAssignees.length > 1 ? "s" : ""} selected`}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !title.trim()}
              className="rounded-xl"
            >
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
