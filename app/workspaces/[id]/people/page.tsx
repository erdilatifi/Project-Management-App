"use client"

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { InviteUser } from '@/components/workspaces/InviteUser'
import { createClient } from '@/utils/supabase/client'
import type { Member } from '@/types/workspaces'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { getWorkspaceRole } from '@/utils/permissions'
import { useRouter } from 'next/navigation'

export default function WorkspacePeoplePage() {
  const { id } = useParams<{ id: string }>()
  const workspaceId = id as string
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [rows, setRows] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [canManage, setCanManage] = useState(false)
  const [myRole, setMyRole] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      // fetch members
      const { data: members, error } = await supabase
        .from('workspace_members')
        .select('workspace_id, user_id, role')
        .eq('workspace_id', workspaceId)
      if (error) {
        setLoading(false)
        return
      }
      const ids = (members ?? []).map((m: any) => m.user_id)
      let emailMap: Record<string, string> = {}
      let avatarMap: Record<string, string | null> = {}
      let profileMap: Record<string, { username: string | null; full_name: string | null; job_title: string | null }> = {}
      let appMap: Record<string, { username: string | null; display: string | null }> = {}
      if (ids.length) {
        const { data: users } = await (supabase as any).rpc('get_auth_users_by_ids', { ids })
        const [profsRes, appUsersRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, avatar_url, username, full_name, job_title')
            .in('id', ids),
          supabase
            .from('users')
            .select('id, username, display_name')
            .in('id', ids),
        ])
        const profs = profsRes?.data as any[] | null
        const appUsers = appUsersRes?.data as any[] | null
        emailMap = Object.fromEntries((users ?? []).map((u: any) => [u.id, u.email]))
        avatarMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.avatar_url ?? null]))
        profileMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, { username: (p.username as string | null) ?? null, full_name: (p.full_name as string | null) ?? null, job_title: (p.job_title as string | null) ?? null }]))
        appMap = Object.fromEntries((appUsers ?? []).map((u: any) => [u.id, { username: (u.username as string | null) ?? null, display: (u.display_name as string | null) ?? null }]))

        // Fallback: for any IDs still missing emails, try public view
        const missingEmailIds = ids.filter((x) => !emailMap[x])
        if (missingEmailIds.length) {
          try {
            const { data: more } = await supabase
              .from('auth_users_public')
              .select('id, email')
              .in('id', missingEmailIds)
            ;(more ?? []).forEach((u: any) => {
              if (u?.id && u?.email && !emailMap[u.id]) emailMap[u.id] = u.email
            })
          } catch {
            // ignore, best-effort
          }
        }
      }
      setRows(
        (members ?? []).map((m: any) => {
          const id = m.user_id
          const label =
            profileMap[id]?.username?.trim() ||
            appMap[id]?.username?.trim() ||
            appMap[id]?.display?.trim() ||
            profileMap[id]?.full_name?.trim() ||
            emailMap[id] ||
            'Unknown'
          return {
            workspace_id: m.workspace_id,
            user_id: id,
            role: m.role,
            email: label,
            avatar_url: avatarMap[id] ?? null,
            job_title: profileMap[id]?.job_title ?? null,
          }
        })
      )
      setLoading(false)
    }
    load()
  }, [supabase, workspaceId])

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

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-10 py-12 space-y-6">
        <div className="pt-15 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">People</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Invite teammates and manage access.</p>
          </div>
          {myRole && myRole !== 'owner' ? (
            <button
              className="text-sm px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent transition-colors font-medium"
              onClick={onLeave}
            >
              Leave workspace
            </button>
          ) : null}
        </div>

        <InviteUser workspaceId={workspaceId} />

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Members</h2>
          <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
            <div className="grid grid-cols-4 gap-4 px-4 py-3 text-xs font-semibold text-muted-foreground bg-muted/50 border-b border-border">
              <div>Member</div>
              <div>Position</div>
              <div>Role</div>
              <div>Actions</div>
            </div>
            {loading ? (
              <div className="px-4 py-8 text-sm text-muted-foreground text-center">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="px-4 py-8 text-sm text-muted-foreground text-center">No members yet.</div>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((m) => (
                  <li key={m.user_id} className="grid grid-cols-4 gap-4 px-4 py-3 text-sm hover:bg-accent transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8">
                        {m.avatar_url ? (
                          <AvatarImage src={m.avatar_url} alt={m.email ?? 'Avatar'} />
                        ) : null}
                        <AvatarFallback className="text-xs font-medium">{m.email?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
                      </Avatar>
                      <span className="truncate font-medium text-foreground">{m.email}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-muted-foreground">{(m as any).job_title || 'No Position'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="uppercase text-[11px] tracking-wide font-semibold text-muted-foreground px-2 py-1 rounded-md bg-muted">{m.role}</span>
                    </div>
                    <div className="flex items-center text-xs">
                      {canManage && m.role !== 'owner' ? (
                        <button className="text-xs px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent transition-colors font-medium" onClick={() => removeMember(m.user_id)}>
                          Remove
                        </button>
                      ) : (
                        <span className="text-muted-foreground">Owner-managed</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
