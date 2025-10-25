
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { Message } from '@/types/workspaces'
import { sendMessage, searchUsersByEmailLike } from '@/lib/workspaces'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { X, Pencil, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatTimeAgo } from '@/lib/time'

type Props = { threadId: string; workspaceId: string }

type UserLite = { id: string; email: string | null }

export default function MessagePanel({ threadId, workspaceId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<Message[]>([])
  const [authors, setAuthors] = useState<Record<string, UserLite>>({})
  const [text, setText] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const [participants, setParticipants] = useState<Array<{ id: string; email: string | null; avatar_url: string | null; is_admin: boolean }>>([])
  const [addOpen, setAddOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<Array<{ id: string; email: string }>>([])
  const [canManage, setCanManage] = useState(false)
  const [creatorId, setCreatorId] = useState<string | null>(null)
  const isOwner = creatorId && userId ? creatorId === userId : false
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState<string>("")
  const [savingMsg, setSavingMsg] = useState(false)
  const [editedIds, setEditedIds] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState('Confirm')
  const [confirmDesc, setConfirmDesc] = useState<string>('Are you sure?')
  const confirmActionRef = useRef<null | (() => Promise<void> | void)>(null)
  const [confirming, setConfirming] = useState(false)
  const [threadTitle, setThreadTitle] = useState<string | null>(null)
  const [titleEditing, setTitleEditing] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const [savingTitle, setSavingTitle] = useState(false)

  function openConfirm(opts: { title: string; description: string; action: () => Promise<void> | void }) {
    setConfirmTitle(opts.title)
    setConfirmDesc(opts.description)
    confirmActionRef.current = opts.action
    setConfirmOpen(true)
  }

  // get current user id
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [supabase])

  const scrollToBottom = () => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
    if (error) return
    const rows = (data ?? []) as Message[]
    setItems(rows)
    const ids = Array.from(new Set(rows.map((m) => m.author_id)))
    if (ids.length) {
      const { data: users } = await (supabase as any)
        .from('auth.users')
        .select('id, email')
        .in('id', ids)
      const map: Record<string, UserLite> = {}
      ;(users ?? []).forEach((u: any) => (map[u.id] = { id: u.id, email: u.email }))
      setAuthors(map)
    } else {
      setAuthors({})
    }
    setTimeout(scrollToBottom, 0)
  }, [supabase, threadId])

  const loadParticipants = useCallback(async () => {
    const { data: tp, error } = await supabase
      .from('thread_participants')
      .select('user_id, is_admin')
      .eq('thread_id', threadId)
    if (error) return
    const ids = Array.from(new Set((tp ?? []).map((r: any) => r.user_id as string)))
    // manage permission: admin or thread owner
    let manage = false
    const { data: u } = await supabase.auth.getUser()
    const uid = u.user?.id
    if (uid) {
      manage = (tp ?? []).some((r: any) => r.user_id === uid && !!r.is_admin)
      const { data: thr } = await supabase
        .from('message_threads')
        .select('created_by, title')
        .eq('id', threadId)
        .maybeSingle<{ created_by: string | null; title: string | null }>()
      if (thr?.created_by) {
        setCreatorId(thr.created_by)
        if (thr.created_by === uid) manage = true
      }
      setThreadTitle(thr?.title ?? null)
    }
    setCanManage(!!manage)
    if (ids.length) {
      const [{ data: users }, { data: profs }] = await Promise.all([
        (supabase as any).from('auth.users').select('id, email').in('id', ids),
        supabase.from('profiles').select('id, avatar_url').in('id', ids),
      ])
      const emailMap: Record<string, string | null> = Object.fromEntries(((users ?? []) as any[]).map((x) => [x.id, x.email ?? null]))
      const avatarMap: Record<string, string | null> = Object.fromEntries(((profs ?? []) as any[]).map((x) => [x.id, x.avatar_url ?? null]))
      const adminMap: Record<string, boolean> = Object.fromEntries(((tp ?? []) as any[]).map((x) => [x.user_id, !!x.is_admin]))
      setParticipants(ids.map((id) => ({ id, email: emailMap[id] ?? null, avatar_url: avatarMap[id] ?? null, is_admin: !!adminMap[id] })))
    } else {
      setParticipants([])
    }
  }, [supabase, threadId])

  useEffect(() => {
    setItems([])
    load()
    loadParticipants()
  }, [load, loadParticipants])

  // realtime messages
  useEffect(() => {
    const channel = supabase
      .channel('rt-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` }, (payload) => {
        const m = payload.new as Message
        setItems((cur) => [...cur, m])
        // ensure author email is available in map for new senders
        setAuthors((cur) => {
          if (cur[m.author_id]) return cur
          // fetch in background; optimistic placeholder
          ;(async () => {
            const { data: userRow } = await (supabase as any)
              .from('auth.users')
              .select('id, email')
              .eq('id', m.author_id)
              .maybeSingle()
            if (userRow) {
              setAuthors((c2) => ({ ...c2, [userRow.id]: { id: userRow.id, email: userRow.email } }))
            }
          })()
          return { ...cur }
        })
        setTimeout(scrollToBottom, 0)
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, threadId])

  // realtime participants
  useEffect(() => {
    const channel = supabase
      .channel('rt-thread-participants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'thread_participants', filter: `thread_id=eq.${threadId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const uid = (payload.new as any).user_id as string
          ;(async () => {
            const [{ data: userRow }, { data: profRow }] = await Promise.all([
              (supabase as any)
                .from('auth.users')
                .select('id, email')
                .eq('id', uid)
                .maybeSingle(),
              supabase
                .from('profiles')
                .select('id, avatar_url')
                .eq('id', uid)
                .maybeSingle(),
            ])
            const isAdmin = !!(payload.new as any).is_admin
            if (userRow) setParticipants((cur) => (cur.find((p) => p.id === uid) ? cur : [...cur, { id: userRow.id, email: userRow.email, avatar_url: profRow?.avatar_url ?? null, is_admin: isAdmin }]))
          })()
        } else if (payload.eventType === 'DELETE') {
          const uid = (payload.old as any).user_id as string
          setParticipants((cur) => cur.filter((p) => p.id !== uid))
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, threadId])

  // realtime thread title updates
  useEffect(() => {
    const channel = supabase
      .channel('rt-thread-title')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'message_threads', filter: `id=eq.${threadId}` }, (payload) => {
        const t = payload.new as { title?: string | null }
        setThreadTitle((t?.title ?? null) as any)
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, threadId])

  const onSend = async () => {
    const body = text.trim()
    if (!body) return
    setText('')
    try {
      await sendMessage(threadId, workspaceId, body)
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to send message')
    }
  }
  const saveEdit = async (id: string) => {
    const body = editingText.trim()
    if (!body) { toast.error('Message cannot be empty'); return }
    setSavingMsg(true)
    try {
      await updateMessageBody(supabase, id, body)
      setItems((cur) => cur.map((m) => (m.id === id ? { ...m, body } : m)))
      setEditedIds((cur) => new Set(cur).add(id))
      setEditingId(null)
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to update message')
    } finally {
      setSavingMsg(false)
    }
  }
  const deleteMessage = async (id: string) => {
    if (!confirm('Delete this message?')) return
    try {
      const { error } = await supabase.from('messages').delete().eq('id', id)
      if (error) throw error
      setItems((cur) => cur.filter((m) => m.id !== id))
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to delete message')
    }
  }

  // add participant helpers
  useEffect(() => {
    const id = setTimeout(async () => {
      const term = query.trim()
      if (!term) { setResults([]); return }
      setSearching(true)
      try { setResults(await searchUsersByEmailLike(term)) }
      catch { /* ignore */ }
      finally { setSearching(false) }
    }, 350)
    return () => clearTimeout(id)
  }, [query])

  const addParticipant = async (uid: string) => {
    try {
      await supabase
        .from('thread_participants')
        .upsert({ thread_id: threadId, user_id: uid } as any, { onConflict: 'thread_id,user_id' })
      setAddOpen(false)
      setQuery('')
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to add participant')
    }
  }
  const toggleAdmin = async (uid: string, makeAdmin: boolean) => {
    if (!canManage) return
    try {
      if (creatorId === uid && !makeAdmin) return
      await supabase
        .from('thread_participants')
        .upsert({ thread_id: threadId, user_id: uid, is_admin: makeAdmin } as any, { onConflict: 'thread_id,user_id' })
      setParticipants((cur) => cur.map((p) => (p.id === uid ? { ...p, is_admin: makeAdmin } : p)))
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to update admin')
    }
  }
  const removeParticipant = async (uid: string) => {
    if (!canManage) return
    try {
      // If the owner initiates leaving, delete the thread automatically
      if (creatorId === uid && userId === uid) {
        const { error } = await supabase.from('message_threads').delete().eq('id', threadId)
        if (error) throw error
        const u = new URL(window.location.href)
        u.searchParams.delete('thread')
        window.location.href = u.toString()
        return
      }
      // Prevent others removing the owner
      if (creatorId === uid) return
      if (!confirm('Remove this participant?')) return
      await supabase
        .from('thread_participants')
        .delete()
        .eq('thread_id', threadId)
        .eq('user_id', uid)
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to remove participant')
    }
  }

  return (
    <>
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-neutral-200 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto">
          {participants.length === 0 ? (
            <div className="text-xs text-neutral-500">Public to workspace</div>
          ) : (
            participants.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-2 py-1 rounded-full border border-neutral-200 bg-neutral-50">
                <Avatar className="h-6 w-6">
                  {p.avatar_url ? <AvatarImage src={p.avatar_url} alt={p.email ?? 'Avatar'} /> : null}
                  <AvatarFallback>{p.email?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
                </Avatar>
                <span className="text-xs max-w-[160px] truncate">{p.email ?? 'User'}</span>
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
                    className={`ml-1 text-[10px] px-1.5 py-0.5 rounded ${p.is_admin ? 'bg-blue-600 text-white' : 'bg-neutral-200 text-neutral-800'}`}
                    onClick={() => toggleAdmin(p.id, !p.is_admin)}
                    title={p.is_admin ? 'Remove admin' : 'Make admin'}
                  >
                    {p.is_admin ? 'Admin' : 'Make admin'}
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-2">
          {!addOpen ? (
            canManage ? (
              <button className="text-xs px-2 h-7 rounded border border-neutral-300 bg-white hover:bg-neutral-50" onClick={() => setAddOpen(true)}>Add participant</button>
            ) : null
          ) : (
            <div className="flex items-center gap-2">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search email" className="h-8 w-56" />
              <button className="text-xs px-2 h-7 rounded border border-neutral-300 bg-white hover:bg-neutral-50" onClick={() => { setAddOpen(false); setQuery(''); }}>Cancel</button>
            </div>
          )}
          {participants.some((p) => p.id === userId) && (
            <button className="text-xs px-2 h-7 rounded border border-neutral-300 bg-white hover:bg-neutral-50" onClick={() => removeParticipant(userId!)}>
              Leave thread
            </button>
          )}
          {null}
        </div>
      </div>
      {addOpen && results.length > 0 && (
        <div className="px-2 py-2 border-b border-neutral-200 bg-white">
          <ul className="max-h-48 overflow-auto divide-y divide-neutral-100">
            {results.map((u) => (
              <li key={u.id}>
                <button className="w-full text-left px-2 py-2 hover:bg-neutral-50 text-sm" onClick={() => addParticipant(u.id)}>
                  {u.email}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="px-2 py-2 border-b border-neutral-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          {!titleEditing ? (
            <>
              <h2 className="text-sm font-medium text-neutral-900">{threadTitle ?? 'Untitled thread'}</h2>
              {canManage && (
                <button
                  className="text-[11px] px-1.5 py-0.5 rounded border border-neutral-300 bg-white text-neutral-800"
                  onClick={() => {
                    setTitleEditing(true)
                    setTitleInput(threadTitle ?? '')
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
                    setSavingTitle(true)
                    const { error } = await supabase
                      .from('message_threads')
                      .update({ title: titleInput.trim() || null } as any)
                      .eq('id', threadId)
                    if (error) throw error
                    setThreadTitle(titleInput.trim() || null)
                    setTitleEditing(false)
                  } catch (e: any) {
                    toast.error(e?.message ?? 'Failed to update title')
                  } finally {
                    setSavingTitle(false)
                  }
                }}
              >
                Save
              </button>
              <button className="text-xs px-2 h-7 rounded border border-neutral-300 bg-white text-neutral-900" onClick={() => setTitleEditing(false)}>
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
        ) : items.map((m) => {
          const me = m.author_id === userId
          const email = authors[m.author_id]?.email ?? 'User'
          const initials = (email?.[0]?.toUpperCase() ?? '?')
          return (
            <div key={m.id} className={`group flex items-start gap-3 ${me ? 'justify-end' : ''}`}>
              {!me && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              )}
              <div className={`relative max-w-[70%] rounded-md px-3 py-2 text-sm ${me ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-900'}`}>
                {!me && <div className="text-[11px] text-neutral-500 mb-1">{email}</div>}
                {editingId === m.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      className={`flex-1 h-8 rounded border px-2 text-sm ${me ? 'text-neutral-900' : 'text-neutral-900'}`}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          await saveEdit(m.id)
                        } else if (e.key === 'Escape') {
                          setEditingId(null)
                        }
                      }}
                    />
                    <button className="text-xs px-2 h-7 rounded border border-neutral-300 bg-white text-neutral-900" onClick={() => saveEdit(m.id)} disabled={savingMsg}>Save</button>
                    <button className="text-xs px-2 h-7 rounded border border-neutral-300 bg-white text-neutral-900" onClick={() => setEditingId(null)}>Cancel</button>
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
                            setEditingId(m.id)
                            setEditingText(m.body)
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
          )
        })}
      </div>
      <div className="p-2 border-t border-neutral-200">
        <Input
          placeholder="Type a message and press Enter"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
        />
      </div>
    </div>
    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{confirmTitle}</DialogTitle>
          <DialogDescription>{confirmDesc}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            className="text-sm px-3 h-8 rounded border border-neutral-300 bg-white text-neutral-900"
            onClick={() => setConfirmOpen(false)}
            disabled={confirming}
          >
            Cancel
          </button>
          <button
            className="text-sm px-3 h-8 rounded border border-red-300 bg-red-600 text-white"
            onClick={async () => {
              if (!confirmActionRef.current) return
              setConfirming(true)
              try {
                await confirmActionRef.current()
                setConfirmOpen(false)
              } catch (e: any) {
                toast.error(e?.message ?? 'Action failed')
              } finally {
                setConfirming(false)
              }
            }}
            disabled={confirming}
          >
            Confirm
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}

async function updateMessageBody(supabase: ReturnType<typeof createClient>, id: string, body: string) {
  const { error } = await supabase.from('messages').update({ body }).eq('id', id)
  if (error) throw new Error(error.message)
}
