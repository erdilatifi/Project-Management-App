"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Props = {
  project: { id: string; name: string; description: string | null };
  onUpdated?: (p: { id: string; name: string; description: string | null; is_archived?: boolean | null }) => void;
  onDeleted?: (id: string) => void;
};

export default function EditProjectMenu({ project, onUpdated, onDeleted }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onRename = async () => {
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
      if (data && onUpdated) onUpdated(data as any);
      setOpen(false);
    } catch (e: any) {
      const msg = e?.message || 'Failed to update project'
      if (String(msg).toLowerCase().includes('permission') || String(msg).toLowerCase().includes('not allowed')) {
        toast.error('Not allowed')
      } else {
        toast.error(msg)
      }
    } finally {
      setSaving(false);
    }
  };

  const onArchive = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .update({ is_archived: true })
        .eq("id", project.id)
        .select("id, name, description, is_archived")
        .single();
      if (error) throw error;
      toast.success("Project archived");
      if (data && onUpdated) onUpdated(data as any);
    } catch (e: any) {
      const msg = e?.message || 'Failed to archive project'
      if (String(msg).toLowerCase().includes('permission') || String(msg).toLowerCase().includes('not allowed')) {
        toast.error('Not allowed')
      } else {
        toast.error(msg)
      }
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
    } catch (e: any) {
      const msg = e?.message || 'Failed to delete project'
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
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Manage
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Rename or update the description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button onClick={onArchive} variant="outline">Archive</Button>
              <Button onClick={onDelete} variant="outline">Delete</Button>
            </div>
            <Button onClick={onRename} disabled={saving} variant="outline">
              {saving ? "Saving�?�" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{project.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="outline" onClick={onDeleteConfirmed} disabled={deleting}>
              {deleting ? "Deleting�?�" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
