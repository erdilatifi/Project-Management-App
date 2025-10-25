"use client"

import ThreadList from '@/components/chat/ThreadList'
import MessagePanel from '@/components/chat/MessagePanel'
import { useCallback, useState } from 'react'
import { usePathname, useRouter, useSearchParams, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { createThread } from '@/lib/workspaces'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export default function WorkspaceMessagesPage() {
  const { id: workspaceIdParam } = useParams<{ id: string }>()
  const workspaceId = workspaceIdParam as string
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const activeThreadId = searchParams.get('thread') ?? undefined
  const [newOpen, setNewOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)

  const setThread = useCallback(
    (id?: string) => {
      const sp = new URLSearchParams(searchParams.toString())
      if (id) sp.set('thread', id)
      else sp.delete('thread')
      router.push(`${pathname}?${sp.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const onNewThread = useCallback(async () => {
    setNewOpen(true)
  }, [])

  return (
    <div className="w-full space-y-3 p-2">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-lg font-semibold">Messages</h1>
        <Button size="sm" variant="outline" className="h-8" onClick={onNewThread}>
          <Plus className="w-4 h-4 mr-1" /> New Thread
        </Button>
      </div>
      <div className="h-[calc(100vh-160px)] grid grid-cols-[320px,1fr] border rounded-md overflow-hidden">
        <div className="border-r">
          <ThreadList workspaceId={workspaceId} onSelect={(id) => setThread(id)} activeThreadId={activeThreadId} />
        </div>
        <div>
          {activeThreadId ? (
            <MessagePanel threadId={activeThreadId} workspaceId={workspaceId} />
          ) : (
            <div className="h-full flex items-center justify-center text-neutral-500">Select a thread</div>
          )}
        </div>
      </div>
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>New thread</DialogTitle>
            <DialogDescription>Give your thread a clear title for easy search.</DialogDescription>
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
                    setThread(t.id)
                    setNewOpen(false)
                    setNewTitle('')
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
                setThread(t.id)
                setNewOpen(false)
                setNewTitle('')
              } finally {
                setCreating(false)
              }
            }} disabled={!newTitle.trim() || creating}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
