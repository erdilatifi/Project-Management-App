"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/utils/supabase/client'
import { createThread } from '@/lib/workspaces'
import type { MessageThread } from '@/types/workspaces'
import { Plus, MessageSquare, Trash2 } from 'lucide-react'

type Props = {
  workspaceId: string
  onSelect: (threadId: string) => void
  activeThreadId?: string
}

export default function ThreadList({ workspaceId, onSelect, activeThreadId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [items, setItems] = useState<MessageThread[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('message_threads')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
    setLoading(false)
    if (error) return
    setItems((data ?? []) as MessageThread[])
  }, [supabase, workspaceId])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
    setItems([])
    load()
  }, [load, supabase])

  useEffect(() => {
    const channel = supabase
      .channel('rt-threads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_threads', filter: `workspace_id=eq.${workspaceId}` }, (payload) => {
        const row = payload.new as MessageThread
        setItems((cur) => {
          if (payload.eventType === 'INSERT') return [row, ...cur]
          if (payload.eventType === 'UPDATE') return cur.map((t) => (t.id === row.id ? row : t))
          if (payload.eventType === 'DELETE') return cur.filter((t) => t.id !== (payload.old as any).id)
          return cur
        })
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, workspaceId])

  const onNew = async () => {
    setNewOpen(true)
  }

  const shown = items.filter((t) => (t.title ?? '').toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-neutral-200 flex items-center gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search threads" />
        <Button size="sm" onClick={onNew}><Plus className="w-4 h-4 mr-1" /> New</Button>
      </div>
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-3 space-y-2">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : shown.length === 0 ? (
          <div className="p-3 text-sm text-neutral-500">No threads</div>
        ) : (
          shown.length === 0 ? (
            <div className="p-4 h-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="text-sm text-neutral-500">No threads yet</div>
                <Button size="sm" onClick={onNew}><Plus className="w-4 h-4 mr-1" /> Create first thread</Button>
              </div>
            </div>
          ) : (
            <ul>
              {shown.map((t) => (
                <li key={t.id}>
                  <div className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-neutral-50 ${activeThreadId === t.id ? 'bg-neutral-100' : ''}`}>
                    <button onClick={() => onSelect(t.id)} className="flex-1 text-left flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-neutral-500" />
                      <span className="truncate">{t.title ?? 'Untitled thread'}</span>
                    </button>
                    {userId && (t as any).created_by === userId && (
                      <button
                        className="text-[11px] px-1.5 py-0.5 rounded border border-red-300 bg-white text-red-700"
                        title="Delete thread"
                        onClick={() => { setPendingDeleteId(t.id); setDeleteOpen(true) }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>New thread</DialogTitle>
            <DialogDescription>Enter a descriptive name so it can be found via search.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              autoFocus
              placeholder="Thread title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (!newTitle.trim()) return
                  setCreating(true)
                  try {
                    const t = await createThread(workspaceId, newTitle.trim())
                    setNewOpen(false)
                    setNewTitle('')
                    onSelect(t.id)
                  } finally {
                    setCreating(false)
                  }
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={async () => {
              if (!newTitle.trim()) return
              setCreating(true)
              try {
                const t = await createThread(workspaceId, newTitle.trim())
                setNewOpen(false)
                setNewTitle('')
                onSelect(t.id)
              } finally {
                setCreating(false)
              }
            }} disabled={!newTitle.trim() || creating}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete thread</DialogTitle>
            <DialogDescription>Delete this thread and all its messages? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!pendingDeleteId) return
                try {
                  const { error } = await supabase.from('message_threads').delete().eq('id', pendingDeleteId)
                  if (error) throw error
                  setItems((cur) => cur.filter((x) => x.id !== pendingDeleteId))
                } finally {
                  setDeleteOpen(false)
                  setPendingDeleteId(null)
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
