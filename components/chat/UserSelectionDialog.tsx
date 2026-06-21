"use client"

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { getUserDisplayName } from '@/utils/userDisplay'

type User = {
  id: string
  email: string | null
  full_name: string | null
  username: string | null
  avatar_url: string | null
  display_name: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  onUsersSelected: (userIds: string[]) => void
  selectedUserIds?: string[]
}

export default function UserSelectionDialog({ 
  open, 
  onOpenChange, 
  workspaceId, 
  onUsersSelected,
  selectedUserIds = []
}: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedUserIds))
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getUser()
      setCurrentUserId(data.user?.id ?? null)
    }
    getCurrentUser()
  }, [supabase])

  // Fetch workspace members
  useEffect(() => {
    if (!open || !workspaceId) return

    const fetchUsers = async () => {
      setLoading(true)
      try {
        // Get workspace members (excluding current user if known)
        let query = supabase
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', workspaceId)

        if (currentUserId) {
          query = query.neq('user_id', currentUserId)
        }

        const { data: members, error } = await query

        if (error) throw error

        const userIds = (members ?? []).map((m: any) => m.user_id as string)
        
        if (userIds.length === 0) {
          setUsers([])
          return
        }

        // Get user details from profiles table
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name, username, avatar_url')
          .in('id', userIds)

        // Build a map of profiles by id for quick lookup
        const profileMap = new Map(
          (profiles ?? []).map((p: any) => [p.id as string, p])
        )

        // For members who have no profile row, try to fetch their email via the admin API
        const missingIds = userIds.filter((uid) => !profileMap.has(uid))
        if (missingIds.length) {
          try {
            const query = encodeURIComponent(missingIds.join(','))
            const res = await fetch(`/api/users/by-ids?ids=${query}`, { cache: 'no-store' })
            if (res.ok) {
              const data: Array<{ id: string; email: string; full_name?: string; username?: string }> = await res.json()
              data.forEach((entry) => {
                profileMap.set(entry.id, { id: entry.id, email: entry.email, full_name: entry.full_name ?? null, username: entry.username ?? null, avatar_url: null })
              })
            }
          } catch {}
        }

        // Merge: every member gets an entry, even without a profile
        const merged: User[] = userIds.map((uid) => {
          const row = profileMap.get(uid)
          const displayName = getUserDisplayName({
            full_name: row?.full_name ?? null,
            username: row?.username ?? null,
            email: row?.email ?? null,
            id: uid,
          })

          return {
            id: uid,
            email: row?.email ?? null,
            full_name: row?.full_name ?? null,
            username: row?.username ?? null,
            avatar_url: row?.avatar_url ?? null,
            display_name: displayName,
          }
        })

        setUsers(merged)
      } catch (error: any) {
        toast.error(error.message || 'Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [open, workspaceId, currentUserId, supabase])

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    
    const query = search.toLowerCase()
    return users.filter(u => 
      u.display_name.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.username?.toLowerCase().includes(query)
    )
  }, [users, search])

  const toggleUser = (userId: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const handleConfirm = () => {
    onUsersSelected(Array.from(selected))
    onOpenChange(false)
  }

  const handleCancel = () => {
    setSelected(new Set(selectedUserIds))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Participants
          </DialogTitle>
          <DialogDescription>
            Choose who can participate in this conversation
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>

        {/* User List */}
        <div className="max-h-[300px] overflow-y-auto border rounded-xl">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {search ? 'No users found' : 'No workspace members'}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => toggleUser(user.id)}
                >
                  <Checkbox
                    checked={selected.has(user.id)}
                    onCheckedChange={() => toggleUser(user.id)}
                    className="flex-shrink-0"
                  />
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    {user.avatar_url && (
                      <AvatarImage src={user.avatar_url} alt={user.display_name} />
                    )}
                    <AvatarFallback className="text-xs">
                      {user.display_name[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {user.display_name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected count */}
        <div className="text-sm text-muted-foreground">
          {selected.size} {selected.size === 1 ? 'user' : 'users'} selected
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} className="rounded-xl">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={selected.size === 0}
            className="rounded-xl"
          >
            Add Participants
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
