/**
 * Notification Bell Component
 * 
 * Displays real-time notifications with:
 * - Badge showing unread count
 * - Dropdown list of recent notifications
 * - Real-time updates via Supabase subscriptions
 * - Infinite scroll for loading more notifications
 * - Click handlers for navigation to relevant content
 * 
 * @component
 */
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, MessageSquareText, UserPlus, CheckSquare, Loader2 } from 'lucide-react'
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
  thread_id?: string | null
  message_id?: string | null
  task_id?: string | null
  project_id?: string | null
}

export default function NotificationBell() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const subscribed = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLLIElement | null>(null)

  /**
   * Load notifications from API
   */
  const load = useCallback(async () => {
    if (!user?.id) return

    try {
      const res = await fetch(`/api/notifications?limit=15`, { cache: 'no-store' })
      const json = await res.json()

      if (!res.ok) throw new Error(json?.error || 'Failed to load notifications')

      // Validate and normalize notification IDs
      const validItems: Item[] = (json.items || [])
        .map((item: any) => ({
          ...item,
          id: String(item?.id ?? '').trim(),
        }))
        .filter((item: any) => item && typeof item.id === 'string' && item.id.length > 0)
        .map((item: any) => ({
          ...item,
          id: item.id,
        }))

      setItems(validItems)
      setCursor(json.nextCursor)
      setHasMore(!!json.nextCursor)
      if (typeof json.unread === 'number') setUnreadTotal(json.unread)
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load notifications')
    }
  }, [user?.id])

  const loadMore = useCallback(async () => {
    if (!user?.id || !cursor || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/notifications?limit=15&cursor=${encodeURIComponent(cursor)}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load more notifications')

      // Filter out invalid notifications and convert ID to string if needed
      const validItems: Item[] = (json.items as Item[]).map((item: any) => ({
        ...item,
        id: String(item?.id ?? '').trim(),
      })).filter((item: any) => item && typeof item.id === 'string' && item.id.length > 0)

      setItems((prev) => [...prev, ...validItems])
      setCursor(json.nextCursor)
      setHasMore(!!json.nextCursor)
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load more notifications')
    } finally {
      setLoadingMore(false)
    }
  }, [user?.id, cursor, loadingMore, hasMore])

  useEffect(() => {
    setItems([])
    setCursor(null)
    setHasMore(true)
    setUnreadTotal(0)
    if (user?.id) load()
  }, [user?.id, load])

  // Polling fallback - refresh notifications every 15 seconds to ensure we catch anything missed by realtime
  useEffect(() => {
    if (!user?.id) return

    // We don't need immediate load here if it's already done by the other useEffect
    // when user.id changes. This just sets up the continuous background check.
    const interval = setInterval(() => {
      // Don't poll if we're currently loading more or if the user is scrolling back through history
      if (!loadingMore) {
        load()
      }
    }, 15000)

    return () => clearInterval(interval)
  }, [user?.id, loadingMore, load])

  // Infinite scroll observer
  useEffect(() => {
    if (!open || loadingMore || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { threshold: 0.1, root: scrollContainerRef.current }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [open, loadMore, loadingMore, hasMore])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  useEffect(() => {
    if (!user?.id || subscribed.current) return

    console.log('[notification-bell] Setting up real-time subscription for user', user.id)

    const unsubscribe = subscribeToNotifications(supabase as any, user.id, (p) => {
      if (!p) {
        console.error('[real-time-notification] Payload missing', p)
        return
      }

      const id = String((p as any).id ?? '').trim()
      if (!id) {
        console.error('[real-time-notification] Invalid notification received', p)
        return
      }

      const createdAt =
        typeof p.created_at === 'string' && p.created_at
          ? p.created_at
          : new Date().toISOString()

      const normalized: Item = {
        id,
        type: (p.type ?? 'message_new') as string,
        title: p.title ?? null,
        body: p.body ?? null,
        created_at: createdAt,
        is_read: false,
        workspace_id: p.workspace_id ?? null,
        ref_id: p.ref_id ?? null,
        thread_id: p.thread_id ?? null,
        message_id: p.message_id ?? null,
        task_id: p.task_id ?? null,
        project_id: p.project_id ?? null,
      }

      console.log('[notification-bell] Received real-time notification', normalized)

      setItems((prev) => {
        if (prev.some((item) => item.id === normalized.id)) {
          return prev
        }

        const updated = [normalized, ...prev]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 15)

        return updated
      })
      setUnreadTotal((count) => count + 1)
    })

    subscribed.current = true
    console.log('[notification-bell] Real-time subscription active')

    return () => {
      console.log('[notification-bell] Cleaning up real-time subscription')
      unsubscribe()
      subscribed.current = false
    }
  }, [supabase, user?.id])

  const unread = unreadTotal

  const markAll = async () => {
    if (!user?.id || unread === 0) return
    const prev = items
    const prevUnread = unreadTotal
    setItems((cur) => cur.map((n) => ({ ...n, is_read: true })))
    setUnreadTotal(0)
    try {
      const res = await fetch('/api/notifications/mark-all-read', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to mark all read')
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to mark all read')
      setItems(prev)
      setUnreadTotal(prevUnread)
    }
  }

  const clearAll = async () => {
    if (!user?.id || items.length === 0) return
    const prev = items
    const prevUnread = unreadTotal
    setItems([])
    setUnreadTotal(0)
    try {
      const res = await fetch('/api/notifications/clear', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to clear notifications')
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to clear notifications')
      setItems(prev)
      setUnreadTotal(prevUnread)
    }
  }

  const markRead = async (id: string) => {
    if (!id || typeof id !== 'string' || !id.trim()) {
      return
    }

    const wasUnread = items.some((n) => n.id === id && !n.is_read)
    const prev = items
    const prevUnread = unreadTotal
    setItems((cur) => cur.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    if (wasUnread) setUnreadTotal((count) => Math.max(0, count - 1))
    try {
      const res = await fetch('/api/notifications/mark-read', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ ids: [id] }) 
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || 'Failed to mark read')
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to mark read')
      setItems(prev)
      setUnreadTotal(prevUnread)
    }
  }

  const onClickItem = async (n: Item) => {
    // Validate notification data
    if (!n) {
      console.error('[notification-click] Notification is null or undefined')
      toast.error('Invalid notification')
      return
    }

    if (!n.id || typeof n.id !== 'string' || !n.id.trim()) {
      console.error('[notification-click] Invalid notification ID', { notification: n })
      toast.error('Invalid notification ID')
      return
    }

    // Mark as read (with validation inside)
    await markRead(n.id)

    try {
      switch (n.type) {
        case 'message':
        case 'message_new':
        case 'message_mention':
        case 'thread_added':
          // Try multiple fields to find the thread ID (ref_id, thread_id)
          const threadId = n.ref_id || n.thread_id
          const workspaceId = n.workspace_id

          // Validate required fields for message notifications
          if (workspaceId && typeof workspaceId === 'string' && workspaceId.trim() &&
              threadId && typeof threadId === 'string' && threadId.trim()) {
            router.push(`/workspaces/${workspaceId}/messages?thread=${threadId}`)
          } else {
            console.warn('[notification-click] Missing workspace_id or thread_id for message notification', {
              workspace_id: n.workspace_id,
              ref_id: n.ref_id,
              thread_id: n.thread_id,
              full: n
            })
            toast.error('Cannot open message - missing information')
          }
          break
        case 'task_assigned':
        case 'task_update':
          // Try to navigate to specific task if we have the IDs
          const taskWorkspaceId = n.workspace_id
          const taskProjectId = n.project_id
          const taskId = n.task_id || n.ref_id

          if (taskProjectId && taskId) {
            const params = new URLSearchParams()
            params.set('task', taskId)
            router.push(`/projects/${taskProjectId}/tasks?${params.toString()}`)
          } else if (taskProjectId) {
            router.push(`/projects/${taskProjectId}/tasks`)
          } else if (taskWorkspaceId) {
            router.push(`/workspaces/${taskWorkspaceId}`)
          } else {
            router.push(`/projects`)
          }
          break
        case 'invite':
        case 'workspace_invite':
          if (n.workspace_id && typeof n.workspace_id === 'string' && n.workspace_id.trim()) {
            router.push(`/workspaces/${n.workspace_id}`)
          } else {
            router.push('/workspaces')
          }
          break
        default:
          console.log('[notification-click] Unknown notification type', n.type)
          break
      }
    } catch (error) {
      console.error('[notification-click] Navigation error', error)
      toast.error('Failed to open notification')
    }

    setOpen(false)
  }

  const iconFor = (t: string) => {
    switch (t) {
      case 'message':
      case 'message_new':
      case 'message_mention':
      case 'thread_added':
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

  // Debug: Log state changes
  useEffect(() => {
    console.log('[notification-bell] State updated', { 
      itemsCount: items.length, 
      unread, 
      items: items.slice(0, 3) // Log first 3 items
    })
  }, [items, unread])

  return (
    <div className="relative" ref={containerRef}>
      <button 
        aria-label="Notifications" 
        className="relative p-2 rounded-md hover:bg-accent text-foreground transition-colors" 
        onClick={() => {
          console.log('[notification-bell] Bell clicked, current state:', { itemsCount: items.length, unread, open: !open })
          setOpen((v) => !v)
        }}
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-[10px] leading-4 text-white text-center font-medium">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div ref={scrollContainerRef} className="fixed sm:absolute right-0 sm:right-0 left-0 sm:left-auto top-14 sm:top-auto sm:mt-2 w-full sm:w-[360px] max-h-[calc(100vh-4rem)] sm:max-h-[480px] overflow-auto rounded-none sm:rounded-xl border-t sm:border border-border bg-card shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="text-sm font-semibold text-foreground">Notifications</div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs rounded-lg"
                onClick={() => {
                  console.log('[notification-bell] Manual refresh triggered')
                  load()
                }}
              >
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs rounded-lg"
                onClick={markAll}
                disabled={unread === 0}
              >
                Mark all read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs rounded-lg"
                onClick={clearAll}
                disabled={items.length === 0}
              >
                Clear all
              </Button>
            </div>
          </div>
          {items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">No notifications</div>
          ) : (
            <ul className="divide-y divide-border">
              {items.filter((n) => n && n.id).map((n) => (
                <li key={n.id} className={`px-4 py-3 hover:bg-accent cursor-pointer transition-colors ${n.is_read ? 'opacity-60' : ''}`} onClick={() => onClickItem(n)}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.is_read ? 'bg-muted-foreground' : 'bg-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{iconFor(n.type)}</span>
                        <div className="text-sm font-medium text-foreground truncate">{n.title ?? n.type}</div>
                        <div className="ml-auto text-[11px] text-muted-foreground shrink-0">{formatTimeAgo(n.created_at)}</div>
                      </div>
                      {n.body ? <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{n.body}</div> : null}
                      {n.type === 'workspace_invite' && (
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs rounded-lg"
                            onClick={async (e) => {
                              e.stopPropagation()
                              try {
                                // Build payload - only include fields with valid values
                                const payload: Record<string, string> = {}

                                // Always include notificationId if available
                                if (n.id && typeof n.id === 'string' && n.id.trim()) {
                                  payload.notificationId = n.id
                                }

                                // Include workspaceId if available
                                const wsId = n.workspace_id || n.ref_id
                                if (wsId && typeof wsId === 'string' && wsId.trim()) {
                                  payload.workspaceId = wsId
                                }

                                const res = await fetch('/api/workspaces/invitations/accept', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(payload),
                                })
                                const json = await res.json()
                                if (!res.ok) {
                                  // Surface server error in console for debugging

                                  console.error('[accept-invite] client error', { status: res.status, json })
                                  throw new Error(json?.error || 'Failed to accept invitation')
                                }
                                // Remove notification from list immediately
                                setItems((prev) => prev.filter((item) => item.id !== n.id))
                                toast.success('Invitation accepted')
                                // Reload to refresh workspace data
                                setTimeout(() => {
                                  router.refresh()
                                }, 500)
                              } catch (err: any) {

                                console.error('[accept-invite] client catch', err)
                                toast.error(err?.message ?? 'Failed to accept invitation')
                              }
                            }}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs rounded-lg"
                            onClick={async (e) => {
                              e.stopPropagation()
                              try {
                                // Build payload - only include fields with valid values
                                const payload2: Record<string, string> = {}

                                // Always include notificationId if available
                                if (n.id && typeof n.id === 'string' && n.id.trim()) {
                                  payload2.notificationId = n.id
                                }

                                // Include workspaceId if available
                                const wsId2 = n.workspace_id || n.ref_id
                                if (wsId2 && typeof wsId2 === 'string' && wsId2.trim()) {
                                  payload2.workspaceId = wsId2
                                }

                                const res = await fetch('/api/workspaces/invitations/decline', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(payload2),
                                })
                                const json = await res.json()
                                if (!res.ok) {

                                  console.error('[decline-invite] client error', { status: res.status, json })
                                  throw new Error(json?.error || 'Failed to decline invitation')
                                }
                                // Remove notification from list immediately
                                setItems((prev) => prev.filter((item) => item.id !== n.id))
                                toast.success('Invitation declined')
                              } catch (err: any) {

                                console.error('[decline-invite] client catch', err)
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
              {/* Infinite scroll trigger */}
              {hasMore && (
                <li ref={loadMoreRef} className="px-4 py-3 text-center">
                  {loadingMore ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading more...
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Scroll for more</div>
                  )}
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
