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
        const { data: users } = await (supabase as any)
          .from("auth_users_public")
          .select("id, email")
          .in("id", ids);
        const map: Record<string, UserLite> = {};
        (users ?? []).forEach((u: any) => (map[u.id] = { id: u.id, email: u.email }));
        setAuthors(map);
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
      if (uid && thr.created_by === uid) manage = true;
    }
    setThreadTitle(thr?.title ?? null);

    if (uid && (tp ?? []).some((r: any) => r.user_id === uid && !!r.is_admin)) manage = true;
    setCanManage(!!manage);

    if (ids.length) {
      const [{ data: users }, { data: profs }] = await Promise.all([
        (supabase as any).from("auth_users_public").select("id, email").in("id", ids),
        supabase.from("profiles").select("id, avatar_url").in("id", ids),
      ]);
      const emailMap: Record<string, string | null> = Object.fromEntries(
        ((users ?? []) as any[]).map((x) => [x.id, x.email ?? null])
      );
      const avatarMap: Record<string, string | null> = Object.fromEntries(
        ((profs ?? []) as any[]).map((x) => [x.id, x.avatar_url ?? null])
      );
      const adminMap: Record<string, boolean> = Object.fromEntries(
        ((tp ?? []) as any[]).map((x) => [x.user_id, !!x.is_admin])
      );
      setParticipants(
        ids.map((id) => ({
          id,
          email: emailMap[id] ?? null,
          avatar_url: avatarMap[id] ?? null,
          is_admin: !!adminMap[id],
        }))
      );
    } else {
      setParticipants([]);
    }
  }, [supabase, threadId]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

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
      const { data, error } = await supabase.from("auth_users_public").select("id, email").in("id", ids);
      if (error) return;
      setTypingEmails((cur) => {
        const next = { ...cur };
        (data ?? []).forEach((u: any) => {
          if (u.id && u.email) next[u.id] = u.email;
        });
        return next;
      });
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
              const { data: userRow } = await (supabase as any)
                .from("auth_users_public")
                .select("id, email")
                .eq("id", m.author_id)
                .maybeSingle();
              if (userRow) {
                setAuthors((c2) => ({ ...c2, [userRow.id]: { id: userRow.id, email: userRow.email } }));
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
              const [{ data: userRow }, { data: profRow }] = await Promise.all([
                (supabase as any).from("auth_users_public").select("id, email").eq("id", uid).maybeSingle(),
                supabase.from("profiles").select("id, avatar_url").eq("id", uid).maybeSingle(),
              ]);
              const isAdmin = !!(payload.new as any).is_admin;
              if (userRow) {
                setParticipants((cur) =>
                  cur.find((p) => p.id === uid)
                    ? cur
                    : [
                        ...cur,
                        { id: userRow.id, email: userRow.email, avatar_url: profRow?.avatar_url ?? null, is_admin: isAdmin },
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
    onSuccess: (msg) => {
      setItems((cur) => (cur.some((x) => x.id === msg.id) ? cur : [...cur, msg]));
      setTimeout(scrollToBottom, 0);
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
    if (!canManage) return;
    try {
      // If the owner removes self → delete thread and navigate away
      if (creatorId === uid && userId === uid) {
        const { error } = await supabase.from("message_threads").delete().eq("id", threadId);
        if (error) throw error;
        const u = new URL(window.location.href);
        u.searchParams.delete("thread");
        window.location.href = u.toString();
        return;
      }
      if (creatorId === uid) return; // cannot remove the owner
      if (!confirm("Remove this participant?")) return;
      await supabase.from("thread_participants").delete().eq("thread_id", threadId).eq("user_id", uid);
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
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-neutral-200 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto">
          {participants.length === 0 ? (
            <div className="text-xs text-neutral-500">Public to workspace</div>
          ) : (
            participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 px-2 py-1 rounded-full border border-neutral-200 bg-neutral-50"
              >
                <Avatar className="h-6 w-6">
                  {p.avatar_url ? <AvatarImage src={p.avatar_url} alt={p.email ?? "Avatar"} /> : null}
                  <AvatarFallback>{p.email?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                </Avatar>
                <span className="text-xs max-w-40 truncate">{p.email ?? "User"}</span>
                {creatorId === p.id && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">Owner</span>
                )}
                {canManage && creatorId !== p.id ? (
                  <button
                    className="ml-1 text-neutral-500 hover:text-neutral-800"
                    title="Remove"
                    onClick={() => removeParticipant(p.id)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
                {canManage && creatorId !== p.id ? (
                  <button
                    className={`ml-1 text-[10px] px-1.5 py-0.5 rounded ${
                      p.is_admin ? "bg-blue-600 text-white" : "bg-neutral-200 text-neutral-800"
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

        {/* Removed "Add participant" UI as requested */}
        {participants.some((p) => p.id === userId) && (
          <button
            className="text-xs px-2 h-7 rounded border border-neutral-300 bg-white hover:bg-neutral-50"
            onClick={() => removeParticipant(userId!)}
          >
            Leave thread
          </button>
        )}
      </div>

      {typingIds.size > 0 && (
        <div className="px-3 py-1 text-xs text-neutral-500">
          Typing: {Array.from(typingIds).map((id) => typingEmails[id] ?? "User").join(", ")}
        </div>
      )}

      <div className="px-2 py-2 border-b border-neutral-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          {!titleEditing ? (
            <>
              <h2 className="text-sm font-medium text-neutral-900">{threadTitle ?? "Untitled thread"}</h2>
              {canManage && (
                <button
                  className="text-[11px] px-1.5 py-0.5 rounded border border-neutral-300 bg-white text-neutral-800"
                  onClick={() => {
                    setTitleEditing(true);
                    setTitleInput(threadTitle ?? "");
                  }}
                >
                  Edit title
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Input className="h-8 w-72" value={titleInput} onChange={(e) => setTitleInput(e.target.value)} />
              <button
                className="text-xs px-2 h-7 rounded border border-neutral-300 bg-white text-neutral-900"
                disabled={savingTitle}
                onClick={async () => {
                  try {
                    setSavingTitle(true);
                    const { error } = await supabase
                      .from("message_threads")
                      .update({ title: titleInput.trim() || null } as any)
                      .eq("id", threadId);
                    if (error) throw error;
                    setThreadTitle(titleInput.trim() || null);
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
                className="text-xs px-2 h-7 rounded border border-neutral-300 bg-white text-neutral-900"
                onClick={() => setTitleEditing(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-auto p-3 space-y-3">
        {items.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-sm text-neutral-500">
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
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`relative max-w-[70%] rounded-md px-3 py-2 text-sm ${
                    me ? "bg-blue-600 text-white" : "bg-neutral-100 text-neutral-900"
                  }`}
                >
                  {!me && <div className="text-[11px] text-neutral-500 mb-1">{email}</div>}
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
                      <div className="whitespace-pre-wrap break-words">{m.body}</div>
                      <div className="mt-1 text-[10px] opacity-70 flex items-center gap-2">
                        <span>{formatTimeAgo(m.created_at)}</span>
                        {editedIds.has(m.id) && <span className="opacity-70">(edited)</span>}
                      </div>
                      {me && (
                        <div className="absolute -top-2 right-1 hidden group-hover:flex items-center gap-1">
                          <button
                            className="text-[11px] px-1.5 py-0.5 rounded border border-neutral-300 bg-white text-neutral-800"
                            onClick={() => {
                              setEditingId(m.id);
                              setEditingText(m.body);
                            }}
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="text-[11px] px-1.5 py-0.5 rounded border border-red-300 bg-white text-red-700"
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
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-2 border-t border-neutral-200">
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
        />
      </div>
    </div>
  );
}

async function updateMessageBody(supabase: ReturnType<typeof createClient>, id: string, body: string) {
  const { error } = await supabase.from("messages").update({ body }).eq("id", id);
  if (error) throw new Error(error.message);
}
