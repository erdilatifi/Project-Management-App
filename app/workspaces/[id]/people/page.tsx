"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { InviteUser } from '@/components/workspaces/InviteUser'
import { createClient } from '@/utils/supabase/client'
import type { Member } from '@/types/workspaces'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getWorkspaceRole } from '@/utils/permissions'
import { useRouter } from 'next/navigation'
import { Search, X, UserMinus, Loader2, ArrowLeft } from 'lucide-react'

export default function WorkspacePeoplePage() {
  const { id } = useParams<{ id: string }>()
  const workspaceId = id as string
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [rows, setRows] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [canManage, setCanManage] = useState(false)
  const [myRole, setMyRole] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLLIElement | null>(null)

  const loadMembers = useCallback(async (pageNum: number, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    
    const limit = 20
    const from = (pageNum - 1) * limit
    const to = from + limit - 1
    
    // fetch members with pagination
    const { data: members, error, count } = await supabase
      .from('workspace_members')
      .select('workspace_id, user_id, role', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .range(from, to)
    
    if (error) {
      if (append) setLoadingMore(false)
      else setLoading(false)
      return
    }
    
    setHasMore(count ? (pageNum * limit) < count : false)
      const ids = (members ?? []).map((m: any) => m.user_id)
      let profileMap: Record<
        string,
        { email: string | null; avatar_url: string | null; username: string | null; full_name: string | null; job_title: string | null }
      > = {}
      if (ids.length) {
        const profsRes = await supabase
          .from('profiles')
          .select('id, email, avatar_url, username, full_name, job_title')
          .in('id', ids)
        const profs = profsRes?.data as any[] | null
        profileMap = Object.fromEntries(
          (profs ?? []).map((p: any) => [
            p.id,
            {
              email: (p.email as string | null) ?? null,
              avatar_url: (p.avatar_url as string | null) ?? null,
              username: (p.username as string | null) ?? null,
              full_name: (p.full_name as string | null) ?? null,
              job_title: (p.job_title as string | null) ?? null,
            },
          ])
        )
      }
      const newRows = (members ?? []).map((m: any) => {
          const id = m.user_id
          const profile = profileMap[id]
          const label =
            profile?.username?.trim() ||
            profile?.full_name?.trim() ||
            profile?.email ||
            'Unknown'
          return {
            workspace_id: m.workspace_id,
            user_id: id,
            role: m.role,
            email: label,
            avatar_url: profile?.avatar_url ?? null,
            job_title: profile?.job_title ?? null,
          }
        })
      
      if (append) {
        setRows((prev) => [...prev, ...newRows])
        setLoadingMore(false)
      } else {
        setRows(newRows)
        setLoading(false)
      }
  }, [supabase, workspaceId])

  useEffect(() => {
    setRows([])
    setPage(1)
    setHasMore(false)
    loadMembers(1, false)
  }, [loadMembers])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    const nextPage = page + 1
    setPage(nextPage)
    loadMembers(nextPage, true)
  }, [page, loadingMore, hasMore, loadMembers])

  // Infinite scroll observer
  useEffect(() => {
    if (loadingMore || !hasMore || searchQuery) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
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
  }, [loadMore, loadingMore, hasMore, searchQuery])

  useEffect(() => {
    (async () => {
      const { isAdmin, role } = await getWorkspaceRole(workspaceId)
      setCanManage(isAdmin)
      setMyRole(role ?? null)
    })()
  }, [workspaceId])

  const removeMember = useCallback(async (uid: string) => {
    if (!canManage) return
    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', uid)
      if (error) throw error
      setRows((cur) => cur.filter((m) => m.user_id !== uid))
      toast.success('Member removed')
      // Notify the removed user via fanout
      try {
        await fetch('/api/notifications/fanout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'workspace_removed',
            actorId: (await supabase.auth.getUser()).data.user?.id ?? 'system',
            recipients: [uid],
            workspaceId,
            meta: {},
          }),
        })
      } catch {}
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove member')
    }
  }, [canManage, supabase, workspaceId])

  const onLeave = useCallback(async () => {
    try {
      const res = await fetch('/api/workspaces/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to leave workspace')
      toast.success('You left the workspace')
      router.push('/workspaces')
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to leave workspace')
    }
  }, [workspaceId, router])

  // Filter members based on search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows
    const query = searchQuery.toLowerCase()
    return rows.filter((m) => 
      m.email?.toLowerCase().includes(query) ||
      m.job_title?.toLowerCase().includes(query) ||
      m.role?.toLowerCase().includes(query)
    )
  }, [rows, searchQuery])

  // Keyboard shortcut for search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto max-w-[1200px] px-3 sm:px-6 lg:px-10 py-8 sm:py-12 space-y-6">
        <div className="pt-15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-full hover:bg-accent mt-0.5"
              onClick={() => router.push('/workspaces')}
              title="Back to workspaces"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">People</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Invite teammates and manage access.</p>
            </div>
          </div>
          {myRole && myRole !== 'owner' ? (
            <button
              className="text-sm px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent transition-colors font-medium whitespace-nowrap"
              onClick={onLeave}
            >
              Leave workspace
            </button>
          ) : null}
        </div>

        <InviteUser workspaceId={workspaceId} />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Members ({rows.length})</h2>
          </div>
          
          {/* Search bar */}
          <Card className="border-border shadow-sm rounded-2xl">
            <div className="px-4 sm:px-6 py-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search members (Ctrl/Cmd+K)"
                  className="pl-9 pr-8 bg-background border-border focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                />
                {searchQuery ? (
                  <button
                    aria-label="Clear search"
                    onClick={() => {
                      setSearchQuery('')
                      searchRef.current?.focus()
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          </Card>

          <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
            <div className="hidden md:grid grid-cols-4 gap-4 px-4 py-3 text-xs font-semibold text-muted-foreground bg-muted/50 border-b border-border">
              <div>Member</div>
              <div>Position</div>
              <div>Role</div>
              <div>Actions</div>
            </div>
            {loading ? (
              <div className="px-4 py-8 text-sm text-muted-foreground text-center">Loading…</div>
            ) : filteredRows.length === 0 ? (
              <div className="px-4 py-8 text-sm text-muted-foreground text-center">
                {searchQuery ? 'No members match your search.' : 'No members yet.'}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filteredRows.map((m) => (
                  <li key={m.user_id} className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 px-4 py-4 md:py-3 text-sm hover:bg-accent transition-colors">
                    <div className="flex items-center gap-3 min-w-0 md:col-span-1">
                      <Avatar className="h-10 w-10 md:h-8 md:w-8">
                        {m.avatar_url ? (
                          <AvatarImage src={m.avatar_url} alt={m.email ?? 'Avatar'} />
                        ) : null}
                        <AvatarFallback className="text-xs font-medium">{m.email?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="block truncate font-medium text-foreground">{m.email}</span>
                        <span className="md:hidden block text-xs text-muted-foreground mt-0.5">{m.job_title || 'No Position'}</span>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center">
                      <span className="text-sm text-muted-foreground">{m.job_title || 'No Position'}</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-0">
                      <span className="md:hidden text-xs text-muted-foreground">Role:</span>
                      <span className="uppercase text-[11px] tracking-wide font-semibold text-muted-foreground px-2 py-1 rounded-md bg-muted">{m.role}</span>
                    </div>
                    <div className="flex items-center text-xs md:justify-start">
                      {canManage && m.role !== 'owner' ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => removeMember(m.user_id)}
                          className="h-8 rounded-lg"
                        >
                          <UserMinus className="mr-1.5 h-3.5 w-3.5" /> Remove
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </div>
                  </li>
                ))}
                {/* Infinite scroll trigger - only show when not searching */}
                {!searchQuery && hasMore && (
                  <li ref={loadMoreRef} className="grid grid-cols-1 md:grid-cols-4 gap-4 px-4 py-4">
                    {loadingMore ? (
                      <div className="col-span-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading more members...
                      </div>
                    ) : (
                      <div className="col-span-4 text-center text-sm text-muted-foreground">Scroll for more</div>
                    )}
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
