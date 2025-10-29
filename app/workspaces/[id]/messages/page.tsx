"use client";

import ThreadList from "@/components/chat/ThreadList";
import MessagePanel from "@/components/chat/MessagePanel";
import { useCallback, useMemo, useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams, useParams } from "next/navigation";
import { MessageSquare, ArrowLeft, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

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
  const supabase = useMemo(() => createClient(), []);

  const activeThreadId = searchParams.get("thread") ?? undefined;
  const [threadTitle, setThreadTitle] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);


  const setThread = useCallback(
    (id?: string) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (id) sp.set("thread", id);
      else sp.delete("thread");
      router.push(`${pathname}?${sp.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id ?? null);
    };
    getUser();
  }, [supabase]);

  // Fetch thread title and check if user is creator
  useEffect(() => {
    if (!activeThreadId) {
      setThreadTitle(null);
      setIsCreator(false);
      return;
    }
    
    const fetchThread = async () => {
      const { data } = await supabase
        .from('message_threads')
        .select('title, created_by')
        .eq('id', activeThreadId)
        .maybeSingle();
      
      setThreadTitle(data?.title || 'Untitled thread');
      setIsCreator(currentUserId ? data?.created_by === currentUserId : false);
    };
    
    fetchThread();

    // Real-time subscription for title updates
    const channel = supabase
      .channel('thread-title-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'message_threads',
          filter: `id=eq.${activeThreadId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated.title !== undefined) {
            setThreadTitle(updated.title || 'Untitled thread');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeThreadId, currentUserId, supabase]);

  const saveTitle = async () => {
    if (!activeThreadId) return;
    
    try {
      const { error } = await supabase
        .from('message_threads')
        .update({ title: titleInput.trim() || null })
        .eq('id', activeThreadId);
      
      if (error) throw error;
      
      setThreadTitle(titleInput.trim() || 'Untitled thread');
      setEditingTitle(false);
      toast.success('Title updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update title');
    }
  };


  return (
    <div className="w-full h-screen bg-background">
   
      <div className="h-full pt-16 flex items-center justify-center px-3 sm:px-6">
        <div
          className="flex h-[calc(100vh-7rem)] w-full max-w-[1300px] rounded-2xl border border-border bg-background shadow-lg overflow-hidden"
          role="application"
          aria-label="Workspace messages"
        >
          {/* Minimalistic Sidebar - Thread List */}
          <aside
            className={`
              w-full md:w-[340px] lg:w-[380px]
              border-r border-border
              bg-card
              flex-shrink-0
              ${activeThreadId ? 'hidden md:flex' : 'flex'}
              flex-col
              h-full
            `}
          >
            <ThreadList
              workspaceId={workspaceId}
              onSelect={(id) => setThread(id)}
              activeThreadId={activeThreadId}
            />
          </aside>

          {/* Chat Panel - Flexible width */}
          <main className="flex-1 h-full bg-background flex flex-col overflow-hidden">
            {activeThreadId ? (
              <>
                {/* Back button for mobile - Instagram style */}
                <div className="md:hidden border-b border-border bg-card px-4 py-3 flex items-center gap-3 shadow-sm flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-accent flex-shrink-0"
                    onClick={() => setThread(undefined)}
                    aria-label="Back to messages"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  {editingTitle ? (
                    <>
                      <Input
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTitle();
                          if (e.key === 'Escape') setEditingTitle(false);
                        }}
                        className="h-8 text-sm flex-1"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={saveTitle}
                        className="h-8 px-3 text-xs"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingTitle(false)}
                        className="h-8 px-3 text-xs"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base font-semibold text-foreground truncate">{threadTitle || 'Loading...'}</h2>
                      </div>
                      {isCreator && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full hover:bg-accent flex-shrink-0"
                          onClick={() => {
                            setTitleInput(threadTitle || '');
                            setEditingTitle(true);
                          }}
                          aria-label="Edit title"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
                {/* Message Panel - takes remaining height */}
                <div className="flex-1 overflow-hidden">
                  <MessagePanel threadId={activeThreadId} workspaceId={workspaceId} />
                </div>
              </>
            ) : (
              <EmptyState />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/** Modern empty state */
function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center bg-muted/20">
      <div className="mx-auto flex max-w-md flex-col items-center text-center px-6">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Select a Chat</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Choose a conversation from the list to view messages and start chatting.
        </p>
      </div>
    </div>
  );
}
