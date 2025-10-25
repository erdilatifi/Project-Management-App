"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Search, Mail, Copy } from 'lucide-react'
import { copyToClipboard } from '@/lib/clipboard'
import { createClient } from '@/utils/supabase/client'
import { inviteUserToWorkspace, searchUsersByEmailLike } from '@/lib/workspaces'

type Props = { workspaceId: string }

type UserLite = { id: string; email: string }

export default function InviteUser({ workspaceId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<UserLite[]>([])
  const [members, setMembers] = useState<Set<string>>(new Set())
  const [inviteToken, setInviteToken] = useState<string | null>(null)

  // Load existing members
  useEffect(() => {
    const loadMembers = async () => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId)
      if (!error) setMembers(new Set((data ?? []).map((r: any) => r.user_id as string)))
    }
    loadMembers()
  }, [supabase, workspaceId])

  // Debounced search
  useEffect(() => {
    const id = setTimeout(async () => {
      const term = query.trim()
      if (!term) {
        setResults([])
        return
      }
      setLoading(true)
      try {
        const users = await searchUsersByEmailLike(term)
        setResults(users)
      } catch (e: any) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }, 400)
    return () => clearTimeout(id)
  }, [query])

  const onInvite = useCallback(
    async (email: string) => {
      try {
        const { token } = await inviteUserToWorkspace(workspaceId, email)
        setInviteToken(token)
        toast.success('Invitation created')
      } catch (e: any) {
        toast.error(e?.message ?? 'Failed to invite user')
      }
    },
    [workspaceId]
  )

  return (
    <div className="w-full max-w-xl space-y-3">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-neutral-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users by email"
        />
        {query && (
          <Button variant="outline" onClick={() => setQuery('')} className="border-neutral-300">Clear</Button>
        )}
      </div>

      {inviteToken && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-neutral-600">Invite token:</span>
          <code className="px-2 py-1 rounded bg-neutral-100 border border-neutral-300 text-neutral-800">{inviteToken}</code>
          <Button variant="outline" size="sm" onClick={() => copyToClipboard(inviteToken)} className="h-8">
            <Copy className="w-4 h-4 mr-1" /> Copy
          </Button>
        </div>
      )}

      <div className="rounded-md border border-neutral-200">
        {loading ? (
          <div className="p-3 text-sm text-neutral-500">Searching…</div>
        ) : results.length === 0 ? (
          <div className="p-3 text-sm text-neutral-500">No results</div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {results.map((u) => (
              <li key={u.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-neutral-500" />
                  <span className="text-sm">{u.email}</span>
                </div>
                {members.has(u.id) ? (
                  <Badge>Member</Badge>
                ) : (
                  <Button size="sm" onClick={() => onInvite(u.email)}>Invite</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Manual invite when the email is not in results */}
      {query && !results.some((r) => r.email.toLowerCase() === query.trim().toLowerCase()) && (
        <div className="flex items-center justify-between p-3 rounded-md border border-dashed border-neutral-300">
          <div className="text-sm text-neutral-700">Invite “{query.trim()}”</div>
          <Button size="sm" onClick={() => onInvite(query.trim())}>Invite</Button>
        </div>
      )}
    </div>
  )
}

