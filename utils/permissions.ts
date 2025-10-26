import { createClient } from '@/utils/supabase/client'

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer' | null

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient()
  try {
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}

export async function getWorkspaceRole(workspaceId: string): Promise<{ role: WorkspaceRole; isOwner: boolean; isAdmin: boolean }>
{
  const supabase = createClient()
  const uid = await getCurrentUserId()
  if (!uid) return { role: null, isOwner: false, isAdmin: false }

  // Prefer membership role. If not found, check owner via workspaces table.
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', uid)
    .maybeSingle<{ role: WorkspaceRole }>()

  let role: WorkspaceRole = member?.role ?? null
  let isOwner = false

  if (!role) {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .maybeSingle<{ owner_id: string }>()
    if (ws?.owner_id && ws.owner_id === uid) {
      role = 'owner'
      isOwner = true
    }
  } else {
    isOwner = role === 'owner'
  }

  const isAdmin = isOwner || role === 'admin'
  return { role, isOwner, isAdmin }
}

