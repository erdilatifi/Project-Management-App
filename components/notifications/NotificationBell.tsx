"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, MessageSquareText, UserPlus, CheckSquare } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/app/context/ContextApiProvider'
import { formatTimeAgo } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { subscribeToNotifications } from '@/lib/notifications/subscribe'
import { useRouter } from 'next/navigation'

type Item = {
  id: string
  type: string
  title: string | null
  body: string | null
  created_at: string
  is_read: boolean
  workspace_id?: string | null
  ref_id?: string | null
}

export default function NotificationBell() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const subscribed = useRef(false)

  const load = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`/api/notifications?limit=15`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load notifications')
      setItems(json.items as Item[])
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load notifications')
    }
  }, [user?.id])

  useEffect(() => {
    setItems([])
    if (user?.id) load()
  }, [user?.id, load])

  useEffect(() => {
    if (!user?.id || subscribed.current) return
    const unsubscribe = subscribeToNotifications(supabase as any, user.id, (p) => {
      setItems((prev) => ([
        { id: p.id, type: (p.type ?? 'message_new') as string, title: p.title ?? null, body: p.body ?? null, created_at: p.created_at, is_read: false },
        ...prev,
      ]).slice(0, 15))
    })
    subscribed.current = true
    return () => {
      unsubscribe()
      subscribed.current = false
    }
  }, [supabase, user?.id])

  const unread = items.filter((i) => !i.is_read).length


  const markAll = async () => {
    if (!user?.id || unread === 0) return
    const prev = items
    setItems((cur) => cur.map((n) => ({ ...n, is_read: true })))
    try {
      const res = await fetch('/api/notifications/mark-all-read', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to mark all read')
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to mark all read')
      setItems(prev)
    }
  }

  const clearAll = async () => {
    if (!user?.id || items.length === 0) return
    const prev = items
    setItems([])
    try {
      const res = await fetch('/api/notifications/clear', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to clear notifications')
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to clear notifications')
      setItems(prev)
    }
  }

  const markRead = async (id: string) => {
    const prev = items
    setItems((cur) => cur.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    try {
      const res = await fetch('/api/notifications/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to mark read')
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to mark read')
      setItems(prev)
    }
  }

  const onClickItem = async (n: Item) => {
    await markRead(n.id)
    switch (n.type) {
      case 'message':
      case 'message_new':
      case 'message_mention':
        if (n.workspace_id && n.ref_id) router.push(`/workspaces/${n.workspace_id}/messages?thread=${n.ref_id}`)
        break
      case 'task_assigned':
      case 'task_update':
        router.push(`/projects`)
        break
      case 'invite':
      case 'workspace_invite':
        if (n.workspace_id) router.push(`/workspaces/${n.workspace_id}`)
        else router.push('/workspaces')
        break
      default:
        break
    }
    setOpen(false)
  }

  const iconFor = (t: string) => {
    switch (t) {
      case 'message':
      case 'message_new':
      case 'message_mention':
        return <MessageSquareText className="w-4 h-4" />
      case 'task_assigned':
      case 'task_update':
        return <CheckSquare className="w-4 h-4" />
      case 'invite':
      case 'workspace_invite':
        return <UserPlus className="w-4 h-4" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  return (
    <div className="relative">
      <button aria-label="Notifications" className="relative p-2 rounded-md hover:bg-neutral-900 text-white" onClick={() => setOpen((v) => !v)}>
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-[10px] leading-4 text-white text-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-h-[480px] overflow-auto rounded-md border border-neutral-700 bg-black shadow-lg z-50">
          <div className="flex items-center justify-between p-2 border-b border-neutral-800">
            <div className="text-sm text-neutral-300">Notifications</div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-neutral-700"
                onClick={markAll}
                disabled={unread === 0}
              >
                Mark all read
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-neutral-700"
                onClick={clearAll}
                disabled={items.length === 0}
              >
                Clear all
              </Button>
            </div>
          </div>
          {items.length === 0 ? (
            <div className="p-3 text-sm text-neutral-400">No notifications</div>
          ) : (
            <ul className="divide-y divide-neutral-800">
              {items.map((n) => (
                <li key={n.id} className={`p-3 hover:bg-neutral-900 cursor-pointer ${n.is_read ? 'opacity-70' : ''}`} onClick={() => onClickItem(n)}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 w-2 h-2 rounded-full ${n.is_read ? 'bg-neutral-700' : 'bg-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-300">{iconFor(n.type)}</span>
                        <div className="text-sm font-medium text-white truncate">{n.title ?? n.type}</div>
                        <div className="ml-auto text-[11px] text-neutral-400 shrink-0">{formatTimeAgo(n.created_at)}</div>
                      </div>
                      {n.body ? <div className="text-xs text-neutral-300 mt-1 whitespace-pre-wrap">{n.body}</div> : null}
                      {n.type === 'workspace_invite' && (
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-neutral-700"
                            onClick={async (e) => {
                              e.stopPropagation()
                              try {
                                const res = await fetch('/api/workspaces/invitations/accept', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ workspaceId: n.workspace_id, notificationId: n.id }),
                                })
                                const json = await res.json()
                                if (!res.ok) throw new Error(json?.error || 'Failed to accept invitation')
                                await markRead(n.id)
                                toast.success('Invitation accepted')
                              } catch (err: any) {
                                toast.error(err?.message ?? 'Failed to accept invitation')
                              }
                            }}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-neutral-700"
                            onClick={async (e) => {
                              e.stopPropagation()
                              try {
                                const res = await fetch('/api/workspaces/invitations/decline', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ workspaceId: n.workspace_id, notificationId: n.id }),
                                })
                                const json = await res.json()
                                if (!res.ok) throw new Error(json?.error || 'Failed to decline invitation')
                                await markRead(n.id)
                                toast.success('Invitation declined')
                              } catch (err: any) {
                                toast.error(err?.message ?? 'Failed to decline invitation')
                              }
                            }}
                          >
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
