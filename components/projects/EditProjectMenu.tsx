"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Props = {
  project: { id: string; name: string; description: string | null };
  onUpdated?: (p: { id: string; name: string; description: string | null; is_archived?: boolean | null }) => void;
  onDeleted?: (id: string) => void;
};

type ProjectUpdate = {
  id: string;
  name: string;
  description: string | null;
  is_archived?: boolean | null;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function EditProjectMenu({ project, onUpdated, onDeleted }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onRename = async () => {
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .update({ name: name.trim(), description: description.trim() || null })
        .eq("id", project.id)
        .select("id, name, description, is_archived")
        .single();
      if (error) throw error;
      toast.success("Project updated");
      if (data && onUpdated) onUpdated(data as ProjectUpdate);
      setOpen(false);
    } catch (e) {
      const msg = getErrorMessage(e, 'Failed to update project')
      if (String(msg).toLowerCase().includes('permission') || String(msg).toLowerCase().includes('not allowed')) {
        toast.error('Not allowed')
      } else {
        toast.error(msg)
      }
    } finally {
      setSaving(false);
    }
  };


  const onDelete = () => setDeleteOpen(true);

  const onDeleteConfirmed = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id);
      if (error) throw error;
      toast.success("Project deleted");
      if (typeof onDeleted === "function") onDeleted(project.id);
      setDeleteOpen(false);
      setOpen(false);
    } catch (e) {
      const msg = getErrorMessage(e, 'Failed to delete project')
      if (String(msg).toLowerCase().includes('permission') || String(msg).toLowerCase().includes('not allowed')) {
        toast.error('Not allowed')
      } else {
        toast.error(msg)
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center">
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="rounded-lg">
        Manage
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
            <DialogDescription>Rename or update the description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="rounded-xl bg-background border-border resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
            <Button onClick={onDelete} variant="outline" className="rounded-xl text-destructive hover:text-destructive">
              Delete
            </Button>
            <Button onClick={onRename} disabled={saving} className="rounded-xl">
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{project.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting} className="rounded-xl">
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDeleteConfirmed} disabled={deleting} className="rounded-xl">
              {deleting ? "Deleting..." : "Delete project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
