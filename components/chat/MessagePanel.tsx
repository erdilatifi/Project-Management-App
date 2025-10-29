"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import type { Message } from "@/types/workspaces";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatTimeAgo } from "@/lib/time";

type Props = { threadId: string; workspaceId: string };
type UserLite = { id: string; email: string | null };

export default function MessagePanel({ threadId, workspaceId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<Message[]>([]);
  const [authors, setAuthors] = useState<Record<string, UserLite>>({});
  const [text, setText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

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

  // messages (initial)
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
  });

  useEffect(() => {
    if (!messagesQ.data) return;
    setItems(messagesQ.data);
    const ids = Array.from(new Set(messagesQ.data.map((m) => m.author_id)));
    if (ids.length) {
      (async () => {
        try {
          const [{ data: authUsers }, { data: appUsers }, { data: profs } ] = await Promise.all([
            (supabase as any).from("auth_users_public").select("id, email").in("id", ids),
            supabase.from("users").select("id, username, display_name").in("id", ids),
            supabase.from("profiles").select("id, username").in("id", ids),
          ]);
          const appMap: Record<string, { username: string | null; display: string | null }> = Object.fromEntries(
            ((appUsers ?? []) as any[]).map((x) => [
              String(x.id),
              { username: (x.username as string | null) ?? null, display: (x.display_name as string | null) ?? null },
            ])
          );
          const profMap: Record<string, { username: string | null }> = Object.fromEntries(
            ((profs ?? []) as any[]).map((x) => [String(x.id), { username: (x.username as string | null) ?? null }])
          );
          const map: Record<string, UserLite> = {};
          ((authUsers ?? []) as any[]).forEach((u) => {
            const id = String(u.id);
            const label =
              profMap[id]?.username?.trim() ||
              appMap[id]?.username?.trim() ||
              appMap[id]?.display?.trim() ||
              (u.email as string | null);
            map[id] = { id, email: label ?? null };
          });
          setAuthors(map);
        } catch {
          // fallback: only emails
          const { data: authUsers } = await (supabase as any)
            .from("auth_users_public")
            .select("id, email")
            .in("id", ids);
          const map: Record<string, UserLite> = {};
          (authUsers ?? []).forEach((u: any) => (map[u.id] = { id: u.id, email: u.email }));
          setAuthors(map);
        }
      })();
    } else {
      setAuthors({});
    }
    setTimeout(scrollToBottom, 0);
  }, [messagesQ.data, supabase]);

  // participants + permissions
  const loadParticipants = useCallback(async () => {
    const { data: tp, error } = await supabase
      .from("thread_participants")
      .select("user_id, is_admin")
      .eq("thread_id", threadId);
    if (error) return;

    const ids = Array.from(new Set((tp ?? []).map((r: any) => r.user_id as string)));

    let manage = false;
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;

    const { data: thr } = await supabase
      .from("message_threads")
      .select("created_by, title")
      .eq("id", threadId)
      .maybeSingle<{ created_by: string | null; title: string | null }>();

    if (thr?.created_by) {
      setCreatorId(thr.created_by);
      // Only the creator can manage (edit title, delete thread)
      if (uid && thr.created_by === uid) manage = true;
    }
    setThreadTitle(thr?.title || null);

    // canManage is ONLY for the creator (not admins)
    setCanManage(!!manage);

    if (ids.length) {
      let authUsers: any[] | null = null;
      let appUsers: any[] | null = null;
      let profs: any[] | null = null;
      try {
        const res = await Promise.all([
          (supabase as any).from("auth_users_public").select("id, email").in("id", ids),
          supabase.from("users").select("id, username, display_name").in("id", ids),
          supabase.from("profiles").select("id, avatar_url, username, full_name").in("id", ids),
        ]);
        authUsers = (res[0].data as any[]) ?? null;
        appUsers = (res[1].data as any[]) ?? null;
        profs = (res[2].data as any[]) ?? null;
      } catch {
        const res = await Promise.all([
          (supabase as any).from("auth_users_public").select("id, email").in("id", ids),
          supabase.from("profiles").select("id, avatar_url, username, full_name").in("id", ids),
        ]);
        authUsers = (res[0].data as any[]) ?? null;
        appUsers = null;
        profs = (res[1].data as any[]) ?? null;
      }
      const emailMapRaw: Record<string, string | null> = Object.fromEntries(
        ((authUsers ?? []) as any[]).map((x) => [String(x.id), (x.email as string | null) ?? null])
      );
      const appMap: Record<string, { username: string | null; display: string | null }> = Object.fromEntries(
        ((appUsers ?? []) as any[]).map((x) => [
          String(x.id),
          { username: (x.username as string | null) ?? null, display: (x.display_name as string | null) ?? null },
        ])
      );
      const profMap: Record<string, { username: string | null; full_name: string | null }> = Object.fromEntries(
        ((profs ?? []) as any[]).map((x) => [
          String(x.id),
          { username: (x.username as string | null) ?? null, full_name: (x.full_name as string | null) ?? null },
        ])
      );
      const labelMap: Record<string, string | null> = {};
      Object.keys({ ...emailMapRaw, ...appMap, ...profMap }).forEach((id) => {
        labelMap[id] =
          profMap[id]?.username?.trim() ||
          appMap[id]?.username?.trim() ||
          appMap[id]?.display?.trim() ||
          profMap[id]?.full_name?.trim() ||
          emailMapRaw[id]?.trim() ||
          null;
      });
      const avatarMap: Record<string, string | null> = Object.fromEntries(
        ((profs ?? []) as any[]).map((x) => [String(x.id), (x.avatar_url as string | null) ?? null])
      );
      const adminMap: Record<string, boolean> = Object.fromEntries(
        ((tp ?? []) as any[]).map((x) => [String(x.user_id), !!x.is_admin])
      );
      setParticipants(
        ids.map((id) => ({
          id,
          email: labelMap[String(id)] ?? null,
          avatar_url: avatarMap[String(id)] ?? null,
          is_admin: !!adminMap[String(id)],
        }))
      );
    } else {
      setParticipants([]);
    }
  }, [supabase, threadId]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

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
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, threadId])

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
      try {
        const [{ data: authUsers }, { data: appUsers }, { data: profs }] = await Promise.all([
          supabase.from("auth_users_public").select("id, email").in("id", ids),
          supabase.from("users").select("id, username, display_name").in("id", ids),
          supabase.from("profiles").select("id, username").in("id", ids),
        ]);
        const appMap: Record<string, { username: string | null; display: string | null }> = Object.fromEntries(
          ((appUsers ?? []) as any[]).map((x) => [
            String(x.id),
            { username: (x.username as string | null) ?? null, display: (x.display_name as string | null) ?? null },
          ])
        );
        const profMap: Record<string, { username: string | null }> = Object.fromEntries(
          ((profs ?? []) as any[]).map((x) => [String(x.id), { username: (x.username as string | null) ?? null }])
        );
        setTypingEmails((cur) => {
          const next = { ...cur } as Record<string, string>;
          ((authUsers ?? []) as any[]).forEach((u) => {
            const id = String(u.id);
            const label =
              profMap[id]?.username?.trim() ||
              appMap[id]?.username?.trim() ||
              appMap[id]?.display?.trim() ||
              (u.email as string | null);
            if (id && label) next[id] = label;
          });
          return next;
        });
      } catch {
        const { data } = await supabase.from("auth_users_public").select("id, email").in("id", ids);
        setTypingEmails((cur) => {
          const next = { ...cur } as Record<string, string>;
          (data ?? []).forEach((u: any) => {
            if (u.id && u.email) next[u.id] = u.email;
          });
          return next;
        });
      }
    })();
  }, [supabase, typingIds, typingEmails]);

  // realtime messages
  useEffect(() => {
    const channel = supabase
      .channel("rt-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const m = payload.new as Message;
          setItems((cur) => {
            if (cur.some((x) => x.id === m.id)) return cur;
            return [...cur, m];
          });
          setAuthors((cur) => {
            if (cur[m.author_id]) return cur;
            (async () => {
              try {
                const [{ data: authRow }, { data: appRow }] = await Promise.all([
                  (supabase as any)
                    .from("auth_users_public")
                    .select("id, email")
                    .eq("id", m.author_id)
                    .maybeSingle(),
                  supabase.from("users").select("id, username, display_name").eq("id", m.author_id).maybeSingle(),
                ]);
                const id = (authRow?.id ?? appRow?.id) as string | undefined;
                if (id) {
                  const label = (appRow?.username?.trim() || appRow?.display_name?.trim() || authRow?.email?.trim() || null) as string | null;
                  setAuthors((c2) => ({ ...c2, [id]: { id, email: label } }));
                }
              } catch {
                const { data: authRow } = await (supabase as any)
                  .from("auth_users_public")
                  .select("id, email")
                  .eq("id", m.author_id)
                  .maybeSingle();
                if (authRow) setAuthors((c2) => ({ ...c2, [authRow.id]: { id: authRow.id, email: authRow.email } }));
              }
            })();
            return { ...cur };
          });
          setTimeout(scrollToBottom, 0);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, threadId]);

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
              try {
                const [{ data: authRow }, { data: appRow }, { data: profRow }] = await Promise.all([
                  (supabase as any).from("auth_users_public").select("id, email").eq("id", uid).maybeSingle(),
                  supabase.from("users").select("id, username, display_name").eq("id", uid).maybeSingle(),
                  supabase.from("profiles").select("id, avatar_url, username, full_name").eq("id", uid).maybeSingle(),
                ]);
                const isAdmin = !!(payload.new as any).is_admin;
                if (authRow || appRow) {
                  setParticipants((cur) =>
                    cur.find((p) => p.id === uid)
                      ? cur
                      : [
                          ...cur,
                          {
                            id: (authRow?.id ?? appRow?.id) as string,
                            email: (
                              (profRow?.username?.trim() as string | undefined) ||
                              (appRow?.username?.trim() as string | undefined) ||
                              (appRow?.display_name?.trim() as string | undefined) ||
                              (profRow?.full_name?.trim() as string | undefined) ||
                              (authRow?.email?.trim() as string | undefined) ||
                              null
                            ) as string | null,
                            avatar_url: profRow?.avatar_url ?? null,
                            is_admin: isAdmin,
                          },
                        ]
                  );
                }
              } catch {
                const [{ data: authRow }, { data: profRow }] = await Promise.all([
                  (supabase as any).from("auth_users_public").select("id, email").eq("id", uid).maybeSingle(),
                  supabase.from("profiles").select("id, avatar_url, username, full_name").eq("id", uid).maybeSingle(),
                ]);
                const isAdmin = !!(payload.new as any).is_admin;
                if (authRow) {
                  setParticipants((cur) =>
                    cur.find((p) => p.id === uid)
                      ? cur
                      : [
                          ...cur,
                          { id: authRow.id, email: (profRow?.username?.trim() || profRow?.full_name?.trim() || authRow.email), avatar_url: profRow?.avatar_url ?? null, is_admin: isAdmin },
                        ]
                  );
                }
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

  // send message mutation
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
    onError: (e: any) => toast.error(e?.message ?? "Failed to send message"),
    onSuccess: async (msg) => {
      setItems((cur) => (cur.some((x) => x.id === msg.id) ? cur : [...cur, msg]));
      setTimeout(scrollToBottom, 0);

      // Fanout notifications to participants or workspace members (exclude author)
      try {
        const actor = userId;
        if (!actor) return;
        let recipients = participants.map((p) => p.id).filter((id) => id && id !== actor);
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
          await fetch('/api/notifications/fanout', {
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
        }
      } catch {}
    },
  });

  const onSend = async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    sendMutation.mutate(body);
  };

  const toggleAdmin = async (uid: string, makeAdmin: boolean) => {
    if (!canManage) return;
    try {
      if (creatorId === uid && !makeAdmin) return;
      await supabase
        .from("thread_participants")
        .upsert({ thread_id: threadId, user_id: uid, is_admin: makeAdmin } as any, {
          onConflict: "thread_id,user_id",
        });
      setParticipants((cur) => cur.map((p) => (p.id === uid ? { ...p, is_admin: makeAdmin } : p)));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update admin");
    }
  };

  const removeParticipant = async (uid: string) => {
    try {
      // If user is leaving their own thread
      if (userId === uid) {
        // If owner leaves, delete the entire thread
        if (creatorId === uid) {
          if (!confirm("As the owner, leaving will delete this thread for everyone. Continue?")) return;
          const { error } = await supabase.from("message_threads").delete().eq("id", threadId);
          if (error) throw error;
          toast.success("Thread deleted");
        } else {
          // Regular participant leaving
          if (!confirm("Leave this conversation?")) return;
          const { error } = await supabase.from("thread_participants").delete().eq("thread_id", threadId).eq("user_id", uid);
          if (error) throw error;
          toast.success("Left conversation");
        }
        // Navigate away
        const u = new URL(window.location.href);
        u.searchParams.delete("thread");
        window.location.href = u.toString();
        return;
      }
      
      // Admin removing another user
      if (!canManage) return;
      if (creatorId === uid) return; // cannot remove the owner
      if (!confirm("Remove this participant?")) return;
      await supabase.from("thread_participants").delete().eq("thread_id", threadId).eq("user_id", uid);
      toast.success("Participant removed");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to remove participant");
    }
  };

  const saveEdit = async (id: string) => {
    const body = editingText.trim();
    if (!body) {
      toast.error("Message cannot be empty");
      return;
    }
    setSavingMsg(true);
    try {
      await updateMessageBody(supabase, id, body);
      setItems((cur) => cur.map((m) => (m.id === id ? { ...m, body } : m)));
      setEditedIds((cur) => new Set(cur).add(id));
      setEditingId(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update message");
    } finally {
      setSavingMsg(false);
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      const { error } = await supabase.from("messages").delete().eq("id", id);
      if (error) throw error;
      setItems((cur) => cur.filter((m) => m.id !== id));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete message");
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
                {canManage && creatorId !== p.id ? (
                  <button
                    className={`ml-1 text-[10px] px-1.5 py-0.5 rounded ${
                      p.is_admin ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"
                    }`}
                    onClick={() => toggleAdmin(p.id, !p.is_admin)}
                    title={p.is_admin ? "Remove admin" : "Make admin"}
                  >
                    {p.is_admin ? "Admin" : "Make admin"}
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>

        {/* Leave button - visible to all participants and owner */}
        {userId && (participants.some((p) => p.id === userId) || creatorId === userId) && (
          <button
            className="text-xs px-3 py-2 rounded-lg border border-border bg-card hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 hover:border-red-300 font-medium transition-colors whitespace-nowrap"
            onClick={() => removeParticipant(userId)}
            title={creatorId === userId ? "Leave (will delete thread)" : "Leave conversation"}
          >
            {creatorId === userId ? "Leave & Delete" : "Leave"}
          </button>
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
              <h2 className="text-base font-semibold text-foreground">{threadTitle || "Untitled thread"}</h2>
              {canManage && (
                <button
                  className="text-xs px-2 py-1 rounded-md border border-border bg-card hover:bg-accent font-medium transition-colors"
                  onClick={() => {
                    setTitleEditing(true);
                    setTitleInput(threadTitle || "");
                  }}
                >
                  Edit title
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Input className="h-9 w-72 rounded-lg border-border bg-background" value={titleInput} onChange={(e) => setTitleInput(e.target.value)} />
              <button
                className="text-xs px-3 h-9 rounded-lg border border-border bg-card hover:bg-accent font-medium transition-colors"
                disabled={savingTitle}
                onClick={async () => {
                  try {
                    setSavingTitle(true);
                    const { error } = await supabase
                      .from("message_threads")
                      .update({ title: titleInput.trim() || null } as any)
                      .eq("id", threadId);
                    if (error) throw error;
                    setThreadTitle(titleInput.trim() || "Untitled thread");
                    setTitleEditing(false);
                  } catch (e: any) {
                    toast.error(e?.message ?? "Failed to update title");
                  } finally {
                    setSavingTitle(false);
                  }
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
    </div>
  );
}

async function updateMessageBody(supabase: ReturnType<typeof createClient>, id: string, body: string) {
  const { error } = await supabase.from("messages").update({ body }).eq("id", id);
  if (error) throw new Error(error.message);
}
