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

type User = {
  id: string
  email: string | null
  username: string | null
  avatar_url: string | null
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
    if (!open || !workspaceId || !currentUserId) return

    const fetchUsers = async () => {
      setLoading(true)
      try {
        // Get workspace members (excluding current user)
        const { data: members, error } = await supabase
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', workspaceId)
          .neq('user_id', currentUserId)

        if (error) throw error

        const userIds = members?.map(m => m.user_id) || []
        
        if (userIds.length === 0) {
          setUsers([])
          return
        }

        // Get user details from profiles table
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, username, avatar_url')
          .in('id', userIds)

        const merged: User[] = (profiles ?? []).map((row: any) => ({
          id: row.id,
          email: (row.email as string | null) ?? null,
          username: (row.username as string | null) ?? null,
          avatar_url: (row.avatar_url as string | null) ?? null,
        }))

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
                      <AvatarImage src={user.avatar_url} alt={user.username || user.email || 'User'} />
                    )}
                    <AvatarFallback className="text-xs">
                      {(user.username?.[0] || user.email?.[0] || '?').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {user.username || user.email || 'Unknown User'}
                    </div>
                    {user.username && user.email && (
                      <div className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </div>
                    )}
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
