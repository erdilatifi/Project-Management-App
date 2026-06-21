import type { SupabaseClient } from '@supabase/supabase-js'
import { getProfileRoleTitle } from '@/lib/profileFields'
import { getUserDisplayName } from '@/utils/userDisplay'

export type WorkspaceMemberProfileSource = {
  full_name?: string | null
  username?: string | null
  display_name?: string | null
  email?: string | null
  avatar_url?: string | null
  role_title?: string | null
  job_title?: string | null
  position?: string | null
}

function cleanString(value?: string | null) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function compactPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
}

export function getWorkspaceMemberProfileFields(profile: WorkspaceMemberProfileSource) {
  const email = cleanString(profile.email)
  const displayName = getUserDisplayName({
    full_name: profile.full_name,
    username: profile.username,
    display_name: profile.display_name,
    email,
  })
  const name = displayName === 'User' ? null : displayName
  const position = cleanString(profile.position) || cleanString(getProfileRoleTitle(profile))
  const avatarUrl = profile.avatar_url === undefined ? undefined : cleanString(profile.avatar_url)

  return {
    name,
    email,
    avatarUrl,
    position,
  }
}

export async function syncWorkspaceMemberProfile(
  supabase: SupabaseClient,
  userId: string,
  profile: WorkspaceMemberProfileSource
) {
  const fields = getWorkspaceMemberProfileFields(profile)
  const updates = [
    compactPayload({ member_name: fields.name, member_email: fields.email }),
    compactPayload({ name: fields.name, email: fields.email }),
    compactPayload({ display_name: fields.name }),
    compactPayload({ avatar_url: fields.avatarUrl }),
    compactPayload({ job_title: fields.position }),
    compactPayload({ role_title: fields.position }),
    compactPayload({ position: fields.position }),
  ].filter((payload) => Object.keys(payload).length > 0)

  await Promise.allSettled(
    updates.map((payload) =>
      supabase
        .from('workspace_members')
        .update(payload as any)
        .eq('user_id', userId)
    )
  )
}