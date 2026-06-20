"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkspace, type WorkspaceRow } from "@/utils/supabase/appActions";
import { Plus } from "lucide-react";

type Props = {
  onCreated?: (workspace: WorkspaceRow) => void;
  triggerLabel?: string;
};

export default function CreateWorkspaceDialog({ onCreated, triggerLabel = "New Workspace" }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const slugPreview = useMemo(() => {
    if (slug.trim()) return slug.trim().toLowerCase();
    if (!name.trim()) return "";
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }, [name, slug]);

  const resetForm = () => {
    setName("");
    setSlug("");
  };

  const submit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const ws = await createWorkspace(name.trim(), slug.trim() || undefined);
      if (ws) {
        onCreated?.(ws);
        resetForm();
        setOpen(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
          <DialogDescription>Create a new workspace you own and manage.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Name</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Product Team"
              className="rounded-xl bg-background border-border"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workspace-slug">Slug (optional)</Label>
            <Input
              id="workspace-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. product-team"
              className="rounded-xl bg-background border-border"
            />
            {slugPreview ? (
              <p className="text-xs text-muted-foreground">URL slug: {slugPreview}</p>
            ) : null}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !name.trim()} className="rounded-xl">
            {submitting ? "Creating..." : "Create workspace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
