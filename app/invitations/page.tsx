"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/context/ContextApiProvider'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type InviteRow = {
  id: string
  workspace_id: string
  workspace_name?: string | null
  email: string | null
  status: string
  created_at: string
}

export default function InvitationsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<InviteRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!user?.email) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/workspaces/invitations')
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load invitations')
      setItems((json?.items ?? []) as InviteRow[])
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load invitations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [user?.email])

  const accept = async (row: InviteRow) => {
    try {
      const res = await fetch('/api/workspaces/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId: row.id, workspaceId: row.workspace_id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to accept invitation')
      setItems((cur) => cur.filter((x) => x.id !== row.id))
      toast.success('Joined workspace')
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to accept invitation')
    }
  }

  const decline = async (row: InviteRow) => {
    try {
      const res = await fetch('/api/workspaces/invitations/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId: row.id, workspaceId: row.workspace_id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to decline invitation')
      setItems((cur) => cur.filter((x) => x.id !== row.id))
      toast.success('Invitation declined')
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to decline invitation')
    }
  }

  return (
    <div className="p-6 w-full">
      <h1 className="text-2xl font-semibold">Invitations</h1>
      <p className="text-sm text-neutral-500">Pending invitations for {user?.email ?? 'your account'}.</p>
      <div className="mt-4 space-y-3">
        {loading ? (
          <Card className="p-4">Loading...</Card>
        ) : items.length === 0 ? (
          <Card className="p-4">No pending invitations.</Card>
        ) : (
          items.map((row) => (
            <Card key={row.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  {row.workspace_name ? `Invite to ${row.workspace_name}` : 'Workspace invite'}
                </div>
                <div className="text-xs text-neutral-500">Created {new Date(row.created_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => accept(row)}>Accept</Button>
                <Button variant="outline" onClick={() => decline(row)}>Decline</Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
