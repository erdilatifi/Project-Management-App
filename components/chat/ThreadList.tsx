"use client"

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/utils/supabase/client'
import { addThreadParticipants, getThreadReads, listAccessibleThreads } from '@/lib/chatAccess'
import type { MessageThread } from '@/types/workspaces'
import { Plus, MessageSquare, Trash2, Search, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import UserSelectionDialog from './UserSelectionDialog'
import { useRouter } from 'next/navigation'

type Props = {
  workspaceId: string
  onSelect: (threadId: string) => void
  activeThreadId?: string
}

export default function ThreadList({ workspaceId, onSelect, activeThreadId }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const loadMoreRef = useRef<HTMLLIElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [userSelectionOpen, setUserSelectionOpen] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  const queryClient = useQueryClient()
  const pageSize = 20

  const threadsQ = useInfiniteQuery({
    queryKey: ['threads', workspaceId, userId],
    enabled: !!userId,
    staleTime: 30000,
    gcTime: 300000,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      if (!userId) return []
      return listAccessibleThreads(supabase, {
        workspaceId,
        userId,
        cursor: pageParam,
        limit: pageSize,
      })
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < pageSize) return undefined
      return lastPage[lastPage.length - 1]?.created_at ?? undefined
    },
  })

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      const uid = data.user?.id ?? null
      setUserId(uid)
      if (uid) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', uid)
          .maybeSingle()
        setUserName(prof?.full_name ?? 'Someone')
      }
    }
    init()
  }, [supabase])


  const { fetchNextPage, hasNextPage, isFetchingNextPage } = threadsQ

  // Infinite scroll observer (keyset pagination)
  useEffect(() => {
    if (isFetchingNextPage || !hasNextPage || search) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observerRef.current.observe(currentRef)
    }

    return () => {
      if (observerRef.current && currentRef) {
        observerRef.current.unobserve(currentRef)
      }
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, search])

  useEffect(() => {
    const channel = supabase
      .channel('rt-threads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_threads', filter: `workspace_id=eq.${workspaceId}` }, (payload) => {
        // Re-evaluate accessible threads on any change
        queryClient.invalidateQueries({ queryKey: ['threads', workspaceId, userId] })
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, workspaceId, userId, queryClient])

  const onNew = async () => { setNewOpen(true) }

  const createMutation = useMutation({
    mutationFn: async ({ title, userIds }: { title: string; userIds: string[] }) => {
      const trimmedTitle = title.trim()

      const { data: thread, error } = await supabase
        .from('message_threads')
        .insert({
          workspace_id: workspaceId,
          title: trimmedTitle || null,
          created_by: userId,
        })
        .select()
        .single()

      if (error) throw error
      if (!thread) throw new Error('Failed to create thread')

      const threadId: string = (thread as MessageThread).id

      const participantsParam = [
        ...(userId ? [{ user_id: userId, is_admin: true }] : []),
        ...userIds
          .filter((participantId) => participantId && participantId !== userId)
          .map((participantId) => ({
            user_id: participantId,
            is_admin: false,
          })),
      ]

      if (participantsParam.length) {
        await addThreadParticipants(supabase, threadId, participantsParam)
      }

      return thread
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['threads', workspaceId, userId] }) },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('message_threads').delete().eq('id', id); if (error) throw new Error(error.message) },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['threads', workspaceId, userId] }) },
  })

  const allThreads = useMemo(() => {
    const map = new Map<string, MessageThread>()
    for (const thread of threadsQ.data?.pages.flat() ?? []) {
      map.set(thread.id, thread)
    }
    return Array.from(map.values())
  }, [threadsQ.data])
  const shown = allThreads.filter((t) => (t.title ?? '').toLowerCase().includes(search.trim().toLowerCase()))

  // Load unread message counts for all threads (messages after last read timestamp)
  useEffect(() => {
    if (!userId || allThreads.length === 0) return
    
    const loadUnreadCounts = async () => {
      const threadIds = allThreads.map(t => t.id)
      
      try {
        // Get last read timestamps for all threads
        const readData = await getThreadReads(supabase, threadIds, userId)

        const lastReadMap: Record<string, string | null> = {}
        readData?.forEach((r: any) => {
          lastReadMap[r.thread_id] = r.last_read_at
        })
        
        // Get unread message counts per thread
        const counts: Record<string, number> = {}
        
        for (const threadId of threadIds) {
          // Skip active thread
          if (threadId === activeThreadId) continue
          
          const lastRead = lastReadMap[threadId]
          
          // Count messages after last read (or all if never read)
          let query = supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', threadId)
            .neq('author_id', userId)
          
          if (lastRead) {
            query = query.gt('created_at', lastRead)
          }
          
          const { count, error } = await query
          
          if (!error && count && count > 0) {
            counts[threadId] = count
          }
        }
        
        setUnreadCounts(counts)
      } catch (e) {
        setUnreadCounts({})
      }
    }
    
    loadUnreadCounts()
  }, [userId, allThreads, supabase, activeThreadId])

  // Clear unread count when thread is selected
  useEffect(() => {
    if (activeThreadId && unreadCounts[activeThreadId]) {
      setUnreadCounts(prev => {
        const next = { ...prev }
        delete next[activeThreadId]
        return next
      })
    }
  }, [activeThreadId, unreadCounts])

  // Real-time updates for new messages
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const newMessage = payload.new as any
          
          
          // Only count if message is from someone else and not in active thread
          if (newMessage.author_id !== userId && newMessage.thread_id !== activeThreadId) {
            setUnreadCounts(prev => ({
              ...prev,
              [newMessage.thread_id]: (prev[newMessage.thread_id] || 0) + 1
            }))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId, workspaceId, activeThreadId])

  // Listen for thread_participants updates to refresh unread counts when last_read_at changes
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('thread-read-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'thread_participants',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as any
          // If last_read_at was updated, clear the unread count for this thread
          if (updated.last_read_at) {
            setUnreadCounts(prev => {
              const next = { ...prev }
              delete next[updated.thread_id]
              return next
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-full hover:bg-accent"
              onClick={() => router.push('/workspaces')}
              title="Back to workspaces"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold text-foreground">Messages</h2>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 rounded-full hover:bg-accent"
            onClick={onNew}
            title="New thread"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9 h-10 bg-background border-border rounded-full"
          />
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-auto">
        {threadsQ.isFetching && allThreads.length === 0 ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : threadsQ.isError ? (
          <div className="p-6 h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-sm text-muted-foreground">Could not load conversations.</div>
              <Button size="sm" variant="outline" onClick={() => threadsQ.refetch()} className="rounded-full">
                Try again
              </Button>
            </div>
          </div>
        ) : shown.length === 0 ? (
          <div className="p-6 h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-sm text-muted-foreground">
                {search ? 'No threads found' : 'No conversations yet'}
              </div>
              {!search && (
                <Button size="sm" onClick={onNew} className="rounded-full">
                  <Plus className="w-4 h-4 mr-2" /> Start a conversation
                </Button>
              )}
            </div>
          </div>
        ) : (
          <ul>
            {shown.map((t) => (
              <li key={t.id}>
                <div
                  className={`w-full px-4 py-3 flex items-center gap-3 transition-all hover:bg-accent/50 group ${
                    activeThreadId === t.id
                      ? 'bg-accent border-l-4 border-l-primary'
                      : ''
                  }`}
                >
                  <button
                    onClick={() => onSelect(t.id)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="flex-shrink-0 relative">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      {/* Unread indicator - show if thread has unread messages */}
                      {unreadCounts[t.id] > 0 && (
                        <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 flex items-center justify-center border-2 border-card">
                          <span className="text-[10px] font-bold text-white">{unreadCounts[t.id]}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className={`font-medium truncate ${
                        activeThreadId === t.id ? 'text-foreground' : 'text-foreground'
                      }`}>
                        {t.title || 'Untitled thread'}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {new Date(t.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                  {userId && (t as any).created_by === userId && (
                    <button
                      className="flex-shrink-0 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950 text-muted-foreground hover:text-red-600 transition-all"
                      title="Delete thread"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPendingDeleteId(t.id)
                        setDeleteOpen(true)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
            
            {/* Infinite scroll trigger */}
            {!search && threadsQ.hasNextPage && (
              <li ref={loadMoreRef} className="px-4 py-4">
                {threadsQ.isFetchingNextPage ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading more...
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground">Scroll for more</div>
                )}
              </li>
            )}
          </ul>
        )}
      </div>
      {/* New Thread Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
            <DialogDescription>Give your conversation a name to help you find it later.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              autoFocus
              placeholder="e.g. Project Planning, Team Updates..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  // Open user selection instead of creating immediately
                  if (newTitle.trim()) {
                    setNewOpen(false)
                    setUserSelectionOpen(true)
                  }
                }
              }}
              className="rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)} disabled={creating} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newTitle.trim()) return
                setNewOpen(false)
                setUserSelectionOpen(true)
              }}
              disabled={!newTitle.trim()}
              className="rounded-xl"
            >
              Next: Select Users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Selection Dialog */}
      <UserSelectionDialog
        open={userSelectionOpen}
        onOpenChange={setUserSelectionOpen}
        workspaceId={workspaceId}
        selectedUserIds={selectedUserIds}
        onUsersSelected={async (userIds) => {
          setSelectedUserIds(userIds)
          setCreating(true)
          try {
            const t = await createMutation.mutateAsync({ 
              title: newTitle.trim(), 
              userIds 
            })
            
            // Fanout thread_added notification
            if (t && userIds.length > 0 && userId) {
              try {
                await fetch('/api/notifications/fanout', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'thread_added',
                    actorId: userId,
                    recipients: userIds,
                    workspaceId,
                    threadId: (t as MessageThread).id,
                    meta: { 
                      thread_name: newTitle.trim() || 'a conversation', 
                      actor_name: userName || 'Someone' 
                    }
                  }),
                });
              } catch (e) {
                console.error('Failed to send thread_added notification', e);
              }
            }

            // Invalidate queries to refresh thread list
            await queryClient.invalidateQueries({ queryKey: ['threads', workspaceId] })
            if (t) {
              // Small delay to ensure thread is fully created
              await new Promise(resolve => setTimeout(resolve, 100))
              onSelect((t as MessageThread).id)
            }
            setNewTitle('')
            setSelectedUserIds([])
          } catch (error: any) {
            toast.error(error.message || 'Failed to create thread')
          } finally {
            setCreating(false)
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!pendingDeleteId) return
                deleteMutation.mutate(pendingDeleteId)
                setDeleteOpen(false)
                setPendingDeleteId(null)
              }}
              className="rounded-xl"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}



















