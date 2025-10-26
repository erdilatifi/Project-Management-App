"use client"

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { InviteUser } from '@/components/workspaces/InviteUser'
import { createClient } from '@/utils/supabase/client'
import type { Member } from '@/types/workspaces'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { getWorkspaceRole } from '@/utils/permissions'

export default function WorkspacePeoplePage() {
  const { id } = useParams<{ id: string }>()
  const workspaceId = id as string
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [canManage, setCanManage] = useState(false)

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
      let nameMap: Record<string, string | null> = {}
      if (ids.length) {
        const { data: users } = await (supabase as any).rpc('get_auth_users_by_ids', { ids })
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, avatar_url, full_name')
          .in('id', ids)
        emailMap = Object.fromEntries((users ?? []).map((u: any) => [u.id, u.email]))
        avatarMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.avatar_url ?? null]))
        nameMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, (p.full_name as string | null) ?? null]))

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
        (members ?? []).map((m: any) => ({
          workspace_id: m.workspace_id,
          user_id: m.user_id,
          role: m.role,
          email: (nameMap[m.user_id]?.trim() || emailMap[m.user_id] || 'Unknown'),
          avatar_url: avatarMap[m.user_id] ?? null,
        }))
      )
      setLoading(false)
    }
    load()
  }, [supabase, workspaceId])

  useEffect(() => {
    (async () => {
      const { isAdmin } = await getWorkspaceRole(workspaceId)
      setCanManage(isAdmin)
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove member')
    }
  }, [canManage, supabase, workspaceId])

  return (
    <div className="p-6 space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-semibold">People</h1>
        <p className="text-sm text-neutral-500">Invite teammates and manage access.</p>
      </div>

      <InviteUser workspaceId={workspaceId} />

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Members</h2>
        <div className="rounded-md border border-neutral-200 overflow-hidden">
          <div className="grid grid-cols-3 gap-2 p-2 text-xs font-medium text-neutral-600 border-b border-neutral-200">
            <div>Member</div>
            <div>Role</div>
            <div>Actions</div>
          </div>
          {loading ? (
            <div className="p-3 text-sm text-neutral-500">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-3 text-sm text-neutral-500">No members yet.</div>
          ) : (
            <ul>
              {rows.map((m) => (
                <li key={m.user_id} className="grid grid-cols-3 gap-2 p-2 text-sm border-t border-neutral-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-7 w-7">
                      {m.avatar_url ? (
                        <AvatarImage src={m.avatar_url} alt={m.email ?? 'Avatar'} />
                      ) : null}
                      <AvatarFallback>{m.email?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{m.email}</span>
                  </div>
                  <div className="uppercase text-[11px] tracking-wide text-neutral-600">{m.role}</div>
                  <div className="text-neutral-400 text-xs">
                    {canManage && m.role !== 'owner' ? (
                      <button className="text-xs px-2 h-7 rounded border border-neutral-300 bg-white hover:bg-neutral-50" onClick={() => removeMember(m.user_id)}>
                        Remove
                      </button>
                    ) : (
                      'Owner-managed'
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
