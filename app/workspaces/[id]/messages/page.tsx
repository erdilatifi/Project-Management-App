"use client";

import ThreadList from "@/components/chat/ThreadList";
import MessagePanel from "@/components/chat/MessagePanel";
import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, MessageSquare, Loader2 } from "lucide-react";

/**
 * WorkspaceMessagesPage
 * - Clean header with subtle gradient + blur
 * - Rounded, bordered app shell with responsive 2-pane layout
 * - Sticky sidebar header, better empty state
 * - Accessible dialog with loading states & keyboard submit
 */
export default function WorkspaceMessagesPage() {
  const { id: workspaceIdParam } = useParams<{ id: string }>();
  const workspaceId = workspaceIdParam as string;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeThreadId = searchParams.get("thread") ?? undefined;

  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const setThread = useCallback(
    (id?: string) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (id) sp.set("thread", id);
      else sp.delete("thread");
      router.push(`${pathname}?${sp.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const onNewThread = useCallback(() => setNewOpen(true), []);

  const canCreate = useMemo(() => newTitle.trim().length > 0 && !creating, [newTitle, creating]);

  return (
    <div className="w-full">


      {/* App shell */}
      <div className="mx-auto max-w-7xl p-3 sm:p-6 lg:px-8">
        <div
          className="
            grid
            rounded-2xl border border-border bg-card shadow-sm
            overflow-hidden
            md:grid-cols-[320px,1fr]
            grid-cols-1
            h-[calc(100vh-9.5rem)]
          "
          role="application"
          aria-label="Workspace messages"
        >
          {/* Sidebar */}
          <aside
            className="
              border-b md:border-b-0 md:border-r border-border
              bg-muted/30
              md:h-full
              flex flex-col
            "
          >
            {/* Sidebar header (sticky) */}
            <div className="sticky top-0 z-10 border-b bg-card/70 backdrop-blur px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground tracking-wide">
                  Threads
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl"
                  onClick={onNewThread}
                  aria-label="Quick create thread"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Thread list */}
            <div className="min-h-0 flex-1">
              <ThreadList
                workspaceId={workspaceId}
                onSelect={(id) => setThread(id)}
                activeThreadId={activeThreadId}
              />
            </div>
          </aside>

          {/* Content */}
          <main className="relative min-h-0">
            {activeThreadId ? (
              <MessagePanel threadId={activeThreadId} workspaceId={workspaceId} />
            ) : (
              <EmptyState onNewThread={onNewThread} />
            )}
          </main>
        </div>
      </div>

      {/* Create thread dialog */}
      <Dialog open={newOpen} onOpenChange={(open) => !creating && setNewOpen(open)}>
        <DialogContent
          className="rounded-2xl sm:max-w-md"
          onInteractOutside={(e) => creating && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Create a new thread</DialogTitle>
            <DialogDescription>
              Give your thread a clear, searchable title. You can rename it anytime.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Input
              autoFocus
              placeholder="e.g. Q4 Launch Plan, API Errors, Design Review"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && canCreate) {
                  e.preventDefault();
                  await handleCreate();
                }
              }}
              aria-label="Thread title"
              disabled={creating}
              className="rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setNewOpen(false)}
              disabled={creating}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!canCreate}
              className="rounded-xl"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const { createThread } = await import("@/lib/workspaces");
      const t = await createThread(workspaceId, newTitle.trim());
      setThread(t.id);
      setNewOpen(false);
      setNewTitle("");
    } finally {
      setCreating(false);
    }
  }
}

/** Subtle, modern empty state */
function EmptyState({ onNewThread }: { onNewThread: () => void }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="mx-auto flex max-w-sm flex-col items-center text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border bg-muted/50">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
        </div>
        <h2 className="text-base font-semibold">No thread selected</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a thread from the left, or start a new conversation.
        </p>
        <Button onClick={onNewThread} className="mt-4 rounded-xl">
          <Plus className="mr-1.5 h-4 w-4" />
          New Thread
        </Button>
      </div>
    </div>
  );
}
