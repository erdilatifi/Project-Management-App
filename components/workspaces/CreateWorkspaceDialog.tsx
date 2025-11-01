"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createWorkspace } from "@/utils/supabase/appActions";

type Props = {
  onCreated?: (workspace: { id: string; name: string }) => void;
};

export default function CreateWorkspaceDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const ws = await createWorkspace(name.trim(), slug.trim() || undefined);
      if (ws) {
        onCreated?.({ id: ws.id, name: ws.name });
        setOpen(false);
      }
    } finally {
      setSubmitting(false);
      setName("");
      setSlug("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" >New Workspace</Button>
      </DialogTrigger>
      <DialogContent >
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
          <DialogDescription >Create a new workspace you own.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workspace name"
              
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Slug (optional)</label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. acme-inc"
              
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={submitting || !name.trim()} variant="outline" >
            {submitting ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


