"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import type { Message } from "@/types/workspaces";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Pencil, Trash2, MoreVertical, LogOut } from "lucide-react";
import { toast } from "sonner";
import { formatTimeAgo } from "@/lib/time";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type Props = { threadId: string; workspaceId: string; title?: string | null; isCreator?: boolean; onTitleUpdated?: (title: string | null) => void };
type UserLite = { id: string; email: string | null };
type UserMeta = { label: string | null; email: string | null; avatar_url: string | null };

export default function MessagePanel({ threadId, workspaceId, title: titleProp, isCreator: isCreatorProp, onTitleUpdated }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [authors, setAuthors] = useState<Record<string, UserLite>>({});
  const [text, setText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  
  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [deleteMessageDialogOpen, setDeleteMessageDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  const [participants, setParticipants] = useState<
    Array<{ id: string; email: string | null; avatar_url: string | null; is_admin: boolean }>
  >([]);
  const [canManage, setCanManage] = useState(false);
  const [creatorId, setCreatorId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [savingMsg, setSavingMsg] = useState(false);
  const [editedIds, setEditedIds] = useState<Set<string>>(new Set());

  const [threadTitle, setThreadTitle] = useState<string | null>(null);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  const fetchUserMeta = useCallback(
    async (userIds: string[]): Promise<Record<string, UserMeta>> => {
      const unique = Array.from(new Set(userIds.filter((id) => !!id)));
      if (!unique.length) return {};
      try {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, email, avatar_url, username, full_name")
          .in("id", unique);
        const meta: Record<string, UserMeta> = {};
        ((profs ?? []) as any[]).forEach((row) => {
          const id = String(row.id);
          const username = (row.username as string | null) ?? null;
          const fullName = (row.full_name as string | null) ?? null;
          const email = (row.email as string | null) ?? null;
          const label =
            username?.trim() ||
            fullName?.trim() ||
            email?.trim() ||
            null;
          meta[id] = {
            label,
            email: email?.trim() ?? null,
            avatar_url: (row.avatar_url as string | null) ?? null,
          };
        });
        return meta;
      } catch {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, email, avatar_url")
          .in("id", unique);
        const meta: Record<string, UserMeta> = {};
        (profs ?? []).forEach((row: any) => {
          const id = String(row.id);
          meta[id] = {
            label: (row.email as string | null) ?? null,
            email: (row.email as string | null) ?? null,
            avatar_url: (row.avatar_url as string | null) ?? null,
          };
        });
        return meta;
      }
    },
    [supabase]
  );

  // Title update mutation with optimistic UI
  const updateTitleMutation = useMutation({
    mutationFn: async (nextTitle: string | null) => {
      const { error } = await supabase
        .from("message_threads")
        .update({ title: nextTitle })
        .eq("id", threadId);
      if (error) throw new Error(error.message);
      return nextTitle;
    },
    onMutate: async (nextTitle) => {
      setSavingTitle(true);
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["threads", workspaceId] });
      
      // Snapshot previous values
      const previousThreads = queryClient.getQueryData(["threads", workspaceId]);
      const previousTitle = threadTitle;
      
      // Optimistically update local state
      setThreadTitle(nextTitle);
      onTitleUpdated?.(nextTitle ?? null);
      
      // Optimistically update thread list cache
      queryClient.setQueriesData(
        { queryKey: ["threads", workspaceId] },
        (old: any) => {
          if (!old) return old;
          return old.map((thread: any) =>
            thread.id === threadId ? { ...thread, title: nextTitle } : thread
          );
        }
      );
      
      return { previousThreads, previousTitle };
    },
    onError: (e: any, _nextTitle, context) => {
      // Rollback on error
      if (context?.previousTitle !== undefined) {
        setThreadTitle(context.previousTitle);
        onTitleUpdated?.(context.previousTitle);
      }
      if (context?.previousThreads) {
        queryClient.setQueryData(["threads", workspaceId], context.previousThreads);
      }
      toast.error(e?.message ?? "Failed to update title");
    },
    onSuccess: () => {
      toast.success("Title updated");
    },
    onSettled: () => {
      setSavingTitle(false);
      // Refetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["threads", workspaceId] });
    },
  });

  const [typingIds, setTypingIds] = useState<Set<string>>(new Set());
  const [typingEmails, setTypingEmails] = useState<Record<string, string>>({});
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  // messages query with stale time for better performance
  const messagesQ = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as Message[];
    },
    staleTime: 10000, // Consider data fresh for 10 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  const items = messagesQ.data ?? [];

  useEffect(() => {
    if (!messagesQ.data) return;
    const ids = Array.from(new Set(messagesQ.data.map((m) => m.author_id)));
    if (ids.length) {
      (async () => {
      const meta = await fetchUserMeta(ids);
      const map: Record<string, UserLite> = {};
      ids.forEach((id) => {
        const info = meta[id];
        map[id] = { id, email: info?.label ?? info?.email ?? null };
      });
      setAuthors(map);
      })();
    } else {
      setAuthors({});
    }
    setTimeout(scrollToBottom, 0);
  }, [messagesQ.data, supabase]);

  // participants + permissions
  const loadParticipants = useCallback(async () => {
    const { data: tp, error } = await supabase.rpc("get_thread_participants", {
      thread_id_param: threadId,
    });
    if (error) {
      console.error("[message-panel] Failed to load participants", {
        threadId,
        error,
      });
      setParticipants([]);
      return;
    }

    const participantsRows = Array.isArray(tp) ? tp : [];

    console.log("[message-panel] Loaded participants", {
      threadId,
      count: participantsRows.length,
    });

    const ids = Array.from(
      new Set(participantsRows.map((r: any) => String(r.user_id)))
    );

    let manage = false;
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;

    const { data: thr, error: threadErr } = await supabase
      .from("message_threads")
      .select("created_by, title")
      .eq("id", threadId)
      .maybeSingle<{ created_by: string | null; title: string | null }>();
    if (threadErr) {
      console.error("[message-panel] Failed to load thread metadata", {
        threadId,
        error: threadErr,
      });
    }

    if (thr?.created_by) {
      setCreatorId(thr.created_by);
      // Only the creator can manage (edit title, delete thread)
      if (uid && thr.created_by === uid) manage = true;
    }
    setThreadTitle(thr?.title || null);

    // canManage is ONLY for the creator (not admins). Allow override via prop.
    setCanManage(isCreatorProp ?? !!manage);

    if (ids.length) {
      const meta = await fetchUserMeta(ids);
      const adminMap: Record<string, boolean> = Object.fromEntries(
        participantsRows.map((x: any) => [String(x.user_id), !!x.is_admin])
      );
      setParticipants(
        ids.map((id) => ({
          id,
          email: meta[id]?.label ?? meta[id]?.email ?? null,
          avatar_url: meta[id]?.avatar_url ?? null,
          is_admin: !!adminMap[String(id)],
        }))
      );
    } else {
      setParticipants([]);
    }
  }, [supabase, threadId, isCreatorProp, fetchUserMeta]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  // Mark thread as read when opened
  useEffect(() => {
    if (!userId || !threadId) return
    
    const markAsRead = async () => {
      try {
        console.log('[message-panel] Marking thread as read', { threadId, userId })
        
        const { error } = await supabase.rpc('mark_thread_read', {
          thread_id_param: threadId,
        })
        
        if (error) {
          if (error.message?.toLowerCase().includes('not allowed')) {
            console.debug('[message-panel] Skipped marking thread as read (not allowed)', {
              threadId,
              userId,
            })
          } else {
            console.error('[message-panel] Failed to mark thread as read', error)
          }
        } else {
          console.log('[message-panel] Thread marked as read successfully')
        }
      } catch (e) {
        console.error('[message-panel] Error marking thread as read', e)
      }
    }
    
    // Mark as read after a short delay to ensure messages are loaded
    const timer = setTimeout(markAsRead, 500)
    return () => clearTimeout(timer)
  }, [supabase, threadId, userId])

  // Real-time subscription for thread updates (title changes)
  useEffect(() => {
    const channel = supabase
      .channel('thread-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'message_threads',
          filter: `id=eq.${threadId}`,
        },
        (payload) => {
          const updated = payload.new as any
          if (updated.title !== undefined) {
            setThreadTitle(updated.title)
            onTitleUpdated?.(updated.title ?? null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, threadId, onTitleUpdated])

  // presence: single channel
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`typing-${threadId}`, { config: { presence: { key: userId } } });
    typingChannelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState() as Record<string, Array<{ typing?: boolean }>>;
      const ids = new Set<string>();
      Object.entries(state).forEach(([uid, metas]) => {
        if (uid !== userId && metas.some((m) => m.typing)) ids.add(uid);
      });
      setTypingIds(ids);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        channel.track({ typing: false });
      }
    });

    return () => {
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
    };
  }, [supabase, threadId, userId]);

  // toggle typing flag
  useEffect(() => {
    if (!userId || !typingChannelRef.current) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingChannelRef.current.track({ typing: !!text.trim() });
    typingTimerRef.current = setTimeout(() => {
      typingChannelRef.current?.track({ typing: false });
    }, 2000);
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [text, userId]);

  // resolve typing user emails
  useEffect(() => {
    const ids = Array.from(typingIds).filter((id) => !typingEmails[id]);
    if (!ids.length) return;
    (async () => {
      const meta = await fetchUserMeta(ids);
      setTypingEmails((cur) => {
        const next = { ...cur } as Record<string, string>;
        ids.forEach((id) => {
          const info = meta[id];
          if (!info) return;
          const label = info.label ?? info.email;
          if (label) next[id] = label;
        });
        return next;
      });
    })();
  }, [fetchUserMeta, typingIds, typingEmails]);

  // realtime messages - update query cache for INSERT, UPDATE, DELETE
  useEffect(() => {
    const channel = supabase
      .channel("rt-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const m = payload.new as Message;
          
          // Update the query cache with the new message
          queryClient.setQueryData<Message[]>(["messages", threadId], (old) => {
            if (!old) return [m];
            if (old.some((x) => x.id === m.id)) return old;
            return [...old, m];
          });
          
          // Fetch author info if not already present
            if (!authors[m.author_id]) {
              (async () => {
                const meta = await fetchUserMeta([m.author_id]);
                const info = meta[m.author_id];
                if (info) {
                  setAuthors((c2) => ({ ...c2, [m.author_id]: { id: m.author_id, email: info.label ?? info.email ?? null } }));
                }
              })();
            }
          
          setTimeout(scrollToBottom, 0);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const m = payload.new as Message;
          
          // Update the message in the cache
          queryClient.setQueryData<Message[]>(["messages", threadId], (old) => {
            if (!old) return old;
            return old.map((msg) => (msg.id === m.id ? m : msg));
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const deletedId = (payload.old as any).id;
          
          // Remove the message from the cache
          queryClient.setQueryData<Message[]>(["messages", threadId], (old) => {
            if (!old) return old;
            return old.filter((msg) => msg.id !== deletedId);
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, threadId, queryClient, authors]);

  // realtime participants
  useEffect(() => {
    const channel = supabase
      .channel("rt-thread-participants")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "thread_participants", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const uid = (payload.new as any).user_id as string;
            (async () => {
              const meta = await fetchUserMeta([uid]);
              const info = meta[uid];
              const isAdmin = !!(payload.new as any).is_admin;
              if (info) {
                setParticipants((cur) =>
                  cur.find((p) => p.id === uid)
                    ? cur
                    : [
                        ...cur,
                        {
                          id: uid,
                          email: info.label ?? info.email ?? null,
                          avatar_url: info.avatar_url ?? null,
                          is_admin: isAdmin,
                        },
                      ]
                );
              }
            })();
          } else if (payload.eventType === "DELETE") {
            const uid = (payload.old as any).user_id as string;
            setParticipants((cur) => cur.filter((p) => p.id !== uid));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, threadId]);

  // realtime thread title
  useEffect(() => {
    const channel = supabase
      .channel("rt-thread-title")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "message_threads", filter: `id=eq.${threadId}` },
        (payload) => {
          const t = payload.new as { title?: string | null };
          setThreadTitle((t?.title ?? null) as any);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, threadId]);

  // send message mutation with optimistic update
  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("messages")
        .insert({ thread_id: threadId, workspace_id: workspaceId, author_id: uid, body })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data as Message;
    },
    onMutate: async (body: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["messages", threadId] });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData<Message[]>(["messages", threadId]);

      // Optimistically update to the new value
      if (userId) {
        const optimisticMessage: Message = {
          id: `temp-${Date.now()}`,
          thread_id: threadId,
          workspace_id: workspaceId,
          author_id: userId,
          body,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        queryClient.setQueryData<Message[]>(
          ["messages", threadId],
          (old) => [...(old ?? []), optimisticMessage]
        );
        setTimeout(scrollToBottom, 0);
      }

      return { previousMessages };
    },
    onError: (e: any, _body, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(["messages", threadId], context.previousMessages);
      }
      toast.error(e?.message ?? "Failed to send message");
    },
    onSuccess: async (msg) => {
      // Replace optimistic message with real one
      queryClient.setQueryData<Message[]>(["messages", threadId], (old) => {
        if (!old) return [msg];
        // Remove temp message and add real one
        const filtered = old.filter((m) => !m.id.startsWith('temp-'));
        return filtered.some((x) => x.id === msg.id) ? filtered : [...filtered, msg];
      });
      setTimeout(scrollToBottom, 0);

      // Fanout notifications to participants or workspace members (exclude author)
      try {
        const actor = userId;
        if (!actor) {
          console.warn('[message-fanout] No actor ID available')
          return;
        }
        
        let recipients = participants.map((p) => p.id).filter((id) => id && id !== actor);
        
        // If no participants, notify all workspace members
        if (!recipients.length) {
          const { data: members } = await supabase
            .from('workspace_members')
            .select('user_id')
            .eq('workspace_id', workspaceId);
          recipients = (members ?? [])
            .map((m: any) => String(m.user_id))
            .filter((id) => id && id !== actor);
        }
        
        if (recipients.length) {
          const type = /@\w+/.test(msg.body) ? 'message_mention' : 'message_new';
          console.log('[message-fanout] Sending notifications', { type, recipients: recipients.length, threadId, messageId: msg.id })
          
          const res = await fetch('/api/notifications/fanout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type,
              actorId: actor,
              recipients,
              workspaceId,
              threadId,
              messageId: msg.id,
              meta: { actor_name: null, snippet: (msg.body || '').slice(0, 140) },
            }),
          });
          
          if (!res.ok) {
            const error = await res.json();
            console.error('[message-fanout] Failed to send notifications', error);
          } else {
            const result = await res.json();
            console.log('[message-fanout] Notifications sent successfully', result);
          }
        } else {
          console.warn('[message-fanout] No recipients to notify')
        }
      } catch (e) {
        console.error('[message-fanout] Error sending notifications', e);
      }
    },
  });

  const onSend = async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    sendMutation.mutate(body);
  };

  // Admin controls removed

  // Remove participant mutation with optimistic update
  const removeParticipantMutation = useMutation({
    mutationFn: async (uid: string) => {
      const { error } = await supabase
        .from("thread_participants")
        .delete()
        .eq("thread_id", threadId)
        .eq("user_id", uid);
      if (error) throw new Error(error.message);
      return uid;
    },
    onMutate: async (uid: string) => {
      const previousParticipants = participants;
      
      // Optimistically remove participant
      setParticipants((cur) => cur.filter((p) => p.id !== uid));
      
      return { previousParticipants };
    },
    onError: (e: any, _uid, context) => {
      if (context?.previousParticipants) {
        setParticipants(context.previousParticipants);
      }
      toast.error(e?.message ?? "Failed to remove participant");
    },
    onSuccess: () => {
      toast.success("Participant removed");
    },
  });

  const removeParticipant = async (uid: string) => {
    // If user is leaving their own thread
    if (userId === uid) {
      // If owner leaves, delete the entire thread
      if (creatorId === uid) {
        if (!confirm("As the owner, leaving will delete this thread for everyone. Continue?")) return;
        try {
          const { error } = await supabase.from("message_threads").delete().eq("id", threadId);
          if (error) throw error;
          toast.success("Thread deleted");
          // Navigate away
          const u = new URL(window.location.href);
          u.searchParams.delete("thread");
          window.location.href = u.toString();
        } catch (e: any) {
          toast.error(e?.message ?? "Failed to delete thread");
        }
        return;
      } else {
        // Regular participant leaving
        if (!confirm("Leave this conversation?")) return;
        try {
          const { error } = await supabase.from("thread_participants").delete().eq("thread_id", threadId).eq("user_id", uid);
          if (error) throw error;
          toast.success("Left conversation");
          // Navigate away
          const u = new URL(window.location.href);
          u.searchParams.delete("thread");
          window.location.href = u.toString();
        } catch (e: any) {
          toast.error(e?.message ?? "Failed to leave conversation");
        }
        return;
      }
    }
    
    // Admin removing another user
    if (!canManage) return;
    if (creatorId === uid) return; // cannot remove the owner
    if (!confirm("Remove this participant?")) return;
    removeParticipantMutation.mutate(uid);
  };

  // Edit message mutation with optimistic update
  const editMessageMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const { error } = await supabase.from("messages").update({ body }).eq("id", id);
      if (error) throw new Error(error.message);
      return { id, body };
    },
    onMutate: async ({ id, body }) => {
      setSavingMsg(true);
      await queryClient.cancelQueries({ queryKey: ["messages", threadId] });
      const previousMessages = queryClient.getQueryData<Message[]>(["messages", threadId]);
      
      // Optimistically update
      queryClient.setQueryData<Message[]>(["messages", threadId], (old) =>
        old?.map((m) => (m.id === id ? { ...m, body } : m)) ?? []
      );
      
      return { previousMessages };
    },
    onError: (e: any, _vars, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(["messages", threadId], context.previousMessages);
      }
      toast.error(e?.message ?? "Failed to update message");
    },
    onSuccess: ({ id }) => {
      setEditedIds((cur) => new Set(cur).add(id));
      setEditingId(null);
    },
    onSettled: () => {
      setSavingMsg(false);
    },
  });

  const saveEdit = async (id: string) => {
    const body = editingText.trim();
    if (!body) {
      toast.error("Message cannot be empty");
      return;
    }
    editMessageMutation.mutate({ id, body });
  };

  // Delete message mutation with optimistic update
  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("messages").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["messages", threadId] });
      const previousMessages = queryClient.getQueryData<Message[]>(["messages", threadId]);
      
      // Optimistically remove
      queryClient.setQueryData<Message[]>(["messages", threadId], (old) =>
        old?.filter((m) => m.id !== id) ?? []
      );
      
      return { previousMessages };
    },
    onError: (e: any, _id, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(["messages", threadId], context.previousMessages);
      }
      toast.error(e?.message ?? "Failed to delete message");
    },
  });

  const deleteMessage = (id: string) => {
    setMessageToDelete(id);
    setDeleteMessageDialogOpen(true);
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    deleteMessageMutation.mutate(messageToDelete);
    setMessageToDelete(null);
  };

  // Delete thread handler
  const handleDeleteThread = async () => {
    try {
      const { error } = await supabase.from("message_threads").delete().eq("id", threadId);
      if (error) throw new Error(error.message);
      
      toast.success("Conversation deleted");
      await queryClient.invalidateQueries({ queryKey: ["threads", workspaceId] });
      router.push(`/workspaces/${workspaceId}/messages`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete conversation");
      throw e;
    }
  };

  // Leave thread handler
  const handleLeaveThread = async () => {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from("thread_participants")
        .delete()
        .eq("thread_id", threadId)
        .eq("user_id", userId);
      
      if (error) throw new Error(error.message);
      
      toast.success("Left conversation");
      await queryClient.invalidateQueries({ queryKey: ["threads", workspaceId] });
      router.push(`/workspaces/${workspaceId}/messages`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to leave conversation");
      throw e;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between gap-3 shadow-sm flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0">
          {participants.length === 0 ? (
            <div className="text-xs text-muted-foreground font-medium">Public to workspace</div>
          ) : (
            participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card shadow-sm"
              >
                <Avatar className="h-6 w-6">
                  {p.avatar_url ? <AvatarImage src={p.avatar_url} alt={p.email ?? "Avatar"} /> : null}
                  <AvatarFallback className="text-xs">{p.email?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-foreground max-w-40 truncate">{p.email ?? "User"}</span>
                {creatorId === p.id && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 font-medium">Owner</span>
                )}
                {canManage && creatorId !== p.id ? (
                  <button
                    className="ml-1 text-muted-foreground hover:text-foreground"
                    title="Remove"
                    onClick={() => removeParticipant(p.id)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
                {/* Admin toggle removed */}
              </div>
            ))
          )}
        </div>

        {/* Thread actions menu */}
        {userId && (participants.some((p) => p.id === userId) || creatorId === userId) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {creatorId === userId ? (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Conversation
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => setLeaveDialogOpen(true)}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Leave Conversation
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {typingIds.size > 0 && (
        <div className="px-4 py-2 text-xs text-muted-foreground bg-card border-b border-border">
          <span className="font-medium">Typing:</span> {Array.from(typingIds).map((id) => typingEmails[id] ?? "User").join(", ")}
        </div>
      )}

      <div className="hidden md:flex px-4 py-3 border-b border-border items-center justify-between bg-card shadow-sm">
        <div className="flex items-center gap-2">
          {!titleEditing ? (
            <>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                {(titleProp ?? threadTitle) || "Untitled thread"}
                {canManage && (
                  <button
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit title"
                    onClick={() => {
                      setTitleEditing(true);
                      setTitleInput((titleProp ?? threadTitle) || "");
                    }}
                    aria-label="Edit title"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </h2>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Input className="h-9 w-72 rounded-lg border-border bg-background" value={titleInput} onChange={(e) => setTitleInput(e.target.value)} />
              <button
                className="text-xs px-3 h-9 rounded-lg border border-border bg-card hover:bg-accent font-medium transition-colors"
                disabled={savingTitle}
                onClick={async () => {
                  const next = (titleInput.trim() || null) as string | null;
                  updateTitleMutation.mutate(next, {
                    onSuccess: () => {
                      setTitleEditing(false);
                    },
                  });
                }}
              >
                Save
              </button>
              <button
                className="text-xs px-3 h-9 rounded-lg border border-border bg-card hover:bg-accent font-medium transition-colors"
                onClick={() => setTitleEditing(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-4">
        {items.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
            No messages yet — start the conversation.
          </div>
        ) : (
          items.map((m) => {
            const me = m.author_id === userId;
            const email = authors[m.author_id]?.email ?? "User";
            const initials = email?.[0]?.toUpperCase() ?? "?";
            return (
              <div key={m.id} className={`group flex items-start gap-3 ${me ? "justify-end" : ""}`}>
                {!me && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`relative max-w-[65%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    me ? "bg-blue-600 text-white" : "bg-card border border-border text-foreground"
                  }`}
                >
                  {!me && <div className="text-[11px] font-medium text-muted-foreground mb-1">{email}</div>}
                  {editingId === m.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="flex-1 h-8 rounded border px-2 text-sm text-neutral-900"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            await saveEdit(m.id);
                          } else if (e.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                      />
                      <button
                        className="text-xs px-2 h-7 rounded border border-neutral-300 bg-white text-neutral-900"
                        onClick={() => saveEdit(m.id)}
                        disabled={savingMsg}
                      >
                        Save
                      </button>
                      <button
                        className="text-xs px-2 h-7 rounded border border-neutral-300 bg-white text-neutral-900"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</div>
                      <div className={`mt-1.5 text-[10px] flex items-center gap-1.5 ${
                        me ? "text-blue-100" : "text-muted-foreground"
                      }`}>
                        <span>{formatTimeAgo(m.created_at)}</span>
                        {editedIds.has(m.id) && <span>(edited)</span>}
                      </div>
                      {me && (
                        <div className="absolute -top-2 right-1 hidden group-hover:flex items-center gap-1 shadow-md rounded-lg overflow-hidden">
                          <button
                            className="px-2 py-1.5 bg-card hover:bg-accent text-foreground border-r border-border transition-colors"
                            onClick={() => {
                              setEditingId(m.id);
                              setEditingText(m.body);
                            }}
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="px-2 py-1.5 bg-card hover:bg-red-50 dark:hover:bg-red-950 text-red-600 transition-colors"
                            onClick={() => deleteMessage(m.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {me && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-border bg-card shadow-sm">
        <Input
          placeholder="Type a message and press Enter"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          className="h-11 rounded-xl border-border bg-background focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Conversation"
        description="Are you sure you want to delete this conversation? This action cannot be undone and all messages will be permanently deleted."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDeleteThread}
      />

      <ConfirmationDialog
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
        title="Leave Conversation"
        description="Are you sure you want to leave this conversation? You will no longer receive messages or be able to view this chat."
        confirmText="Leave"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleLeaveThread}
      />

      <ConfirmationDialog
        open={deleteMessageDialogOpen}
        onOpenChange={(open) => {
          setDeleteMessageDialogOpen(open);
          if (!open) setMessageToDelete(null);
        }}
        title="Delete Message"
        description="Are you sure you want to delete this message? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmDeleteMessage}
      />
    </div>
  );
}
