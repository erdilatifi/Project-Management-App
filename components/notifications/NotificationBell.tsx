"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, MessageSquareText, UserPlus, CheckSquare } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/app/context/ContextApiProvider'
import { formatTimeAgo } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Notification as AppNotification } from '@/types/workspaces'
import { useRouter } from 'next/navigation'

export default function NotificationBell() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const subscribed = useRef(false)

  const load = useCallback(async () => {
    if (!user?.id) return
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(15)
    if (error) {
      console.error(error)
      return
    }
    setItems((data ?? []) as AppNotification[])
  }, [supabase, user?.id])

  useEffect(() => {
    setItems([])
    if (user?.id) load()
  }, [user?.id, load])

  useEffect(() => {
    if (!user?.id || subscribed.current) return
    const channel = supabase
      .channel('rt-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        const n = payload.new as AppNotification
        setItems((prev) => [n, ...prev].slice(0, 15))
      })
      .subscribe()
    subscribed.current = true
    return () => {
      supabase.removeChannel(channel)
      subscribed.current = false
    }
  }, [supabase, user?.id])

  const unread = items.filter((i) => !i.is_read).length

  const markAll = async () => {
    if (!user?.id || unread === 0) return
    const prev = items
    setItems((cur) => cur.map((n) => ({ ...n, is_read: true })))
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    if (error) {
      toast.error(error.message)
      setItems(prev)
    }
  }

  const markRead = async (id: string) => {
    const prev = items
    setItems((cur) => cur.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    if (error) {
      toast.error(error.message)
      setItems(prev)
    }
  }

  const onClickItem = async (n: AppNotification) => {
    await markRead(n.id)
    switch (n.type) {
      case 'message':
        router.push(`/workspaces/${n.workspace_id}/messages?thread=${n.ref_id}`)
        break
      case 'task_assigned':
        router.push(`/projects`)
        break
      case 'invite':
        if (n.workspace_id) router.push(`/workspaces/${n.workspace_id}`)
        else router.push('/workspaces')
        break
      default:
        break
    }
    setOpen(false)
  }

  const iconFor = (t: AppNotification['type']) => {
    switch (t) {
      case 'message':
        return <MessageSquareText className="w-4 h-4" />
      case 'task_assigned':
        return <CheckSquare className="w-4 h-4" />
      case 'invite':
        return <UserPlus className="w-4 h-4" />
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
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-neutral-700"
              onClick={markAll}
              disabled={unread === 0}
            >
              Mark all read
            </Button>
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
