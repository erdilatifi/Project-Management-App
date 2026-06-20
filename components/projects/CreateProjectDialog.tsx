"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createProject, createWorkspace, loadUserWorkspaces, type WorkspaceRow } from "@/utils/supabase/appActions";

type Props = {
  workspaceId: string | null | undefined;
  onCreated?: (project: { id: string; name: string; description: string | null; workspace_id?: string }) => void;
  onWorkspaceCreated?: (workspace: WorkspaceRow) => void;
};

export default function CreateProjectDialog({ workspaceId, onCreated, onWorkspaceCreated }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [wsId, setWsId] = useState<string | null | undefined>(workspaceId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingWs, setLoadingWs] = useState(false);
  const [wsName, setWsName] = useState("");
  const [creatingWs, setCreatingWs] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setWsId(workspaceId);
    }
  }, [open]);

  // Load available workspaces for the user when dialog opens
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoadingWs(true);
      try {
        const data = await loadUserWorkspaces();
        setWorkspaces(data);
        if (!wsId && !workspaceId && data.length > 0) setWsId(data[0].id);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to load workspaces";
        toast.error(message);
        setWorkspaces([]);
      } finally {
        setLoadingWs(false);
      }
    };
    load();

  }, [open, workspaceId, wsId]);

  const activeWorkspaceName = workspaces.find(w => w.id === (wsId ?? workspaceId))?.name;

  const onSubmit = async () => {
    const chosen = wsId ?? workspaceId;
    if (!chosen) {
      toast.error("Select a workspace to create a project");
      return;
    }
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }
    setSubmitting(true);
    try {
      const project = await createProject(chosen, name.trim());
      if (project) {
        // Append description if provided (separate update could be added later)
        if (description.trim()) {
          // Best-effort description update; ignore errors but reflect in UI by reloading caller if needed
          try {
            await supabase
              .from("projects")
              .update({ description: description.trim() })
              .eq("id", project.id);
          } catch {}
        }
        if (onCreated) onCreated({ ...project, description: description.trim() || project.description });
        setOpen(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onCreateWorkspace = async () => {
    if (!wsName.trim()) {
      toast.error("Workspace name is required");
      return;
    }
    setCreatingWs(true);
    try {
      const ws = await createWorkspace(wsName.trim());
      if (ws) {
        setWorkspaces((cur) => [...cur, { id: ws.id, name: ws.name }]);
        setWsId(ws.id);
        setWsName("");
        onWorkspaceCreated?.(ws);
      }
    } finally {
      setCreatingWs(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl">New Project</Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl font-semibold">Create Project</DialogTitle>
            {activeWorkspaceName && (
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                {activeWorkspaceName}
              </span>
            )}
          </div>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Add a new project to your workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!workspaceId && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Workspace</label>
              <Select
                value={wsId ?? undefined}
                onValueChange={(v) => setWsId(v)}
                disabled={loadingWs || workspaces.length === 0}
              >
                <SelectTrigger className="h-10 rounded-xl border-border bg-background">
                  <SelectValue placeholder={loadingWs ? "Loading..." : workspaces.length ? "Select a workspace" : "No workspaces available"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {workspaces.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {workspaces.length === 0 && !loadingWs && (
                <div className="mt-3 space-y-2">
                  <Input
                    value={wsName}
                    onChange={(e) => setWsName(e.target.value)}
                    placeholder="Workspace name"
                    className="h-10 rounded-xl border-border bg-background"
                  />
                  <Button onClick={onCreateWorkspace} disabled={creatingWs} variant="outline" className="w-full rounded-xl">
                    {creatingWs ? "Creating..." : "Create Workspace"}
                  </Button>
                </div>
              )}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="h-10 rounded-xl border-border bg-background"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={4}
              className="rounded-xl border-border bg-background resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSubmit} disabled={submitting} className="rounded-xl px-6">
            {submitting ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
