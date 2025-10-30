export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export type Invitation = {
  id: string
  workspace_id: string
  email: string
  invited_by: string
  token: string
  status: InvitationStatus
  created_at: string
  expires_at: string
}

export type MessageThread = {
  id: string
  workspace_id: string
  title: string | null
  created_by: string | null
  created_at: string
}

export type Message = {
  id: string
  thread_id: string
  workspace_id: string
  author_id: string
  body: string
  created_at: string
  updated_at?: string
}

export type NotificationType = 'message' | 'task_assigned' | 'invite' | 'task_update'

export type Notification = {
  id: string
  user_id: string
  type: NotificationType
  ref_id: string | null
  workspace_id: string | null
  title: string | null
  body: string | null
  is_read: boolean
  created_at: string
}

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer'

export type Member = {
  workspace_id: string
  user_id: string
  role: MemberRole
  email?: string
  avatar_url?: string | null
  job_title?: string | null
  created_at?: string
}
