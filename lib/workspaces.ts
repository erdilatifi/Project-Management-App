"use client"

import { createClient } from '@/utils/supabase/client'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type {
  Invitation,
  Message,
  MessageThread,
  Notification as AppNotification,
  Member,
} from '@/types/workspaces'

function requireUser(user: User | null): asserts user is User {
  if (!user) throw new Error('You must be signed in')
}

function randToken(len = 10): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnopqrstuvwxyz'
  let out = ''
  crypto.getRandomValues(new Uint8Array(len)).forEach((v) => (out += alphabet[v % alphabet.length]))
  return out
}

export async function inviteUserToWorkspace(workspaceId: string, email: string): Promise<{ invitation: Invitation; token: string }>
{
  const supabase = createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr) throw new Error(authErr.message)
  requireUser(user)

  // Permission: only workspace owner/admin can invite
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle<{ role: 'owner' | 'admin' | 'member' | 'viewer' }>()
  const role = membership?.role ?? null
  const isAdmin = role === 'owner' || role === 'admin'
  if (!isAdmin) {
    throw new Error('Not allowed')
  }

  const token = randToken(12)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('workspace_invitations')
    .insert({
      workspace_id: workspaceId,
      email: email.trim().toLowerCase(),
      invited_by: user.id,
      token,
      status: 'pending',
      expires_at: expiresAt,
    } as any)
    .select('*')
    .single<Invitation>()

  if (error) throw new Error(error.message)
  return { invitation: data!, token }
}

export async function acceptInvitation(token: string): Promise<{ workspace: { id: string; name: string; owner_id: string } }>
{
  const supabase = createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr) throw new Error(authErr.message)
  requireUser(user)

  // Use secure RPC to accept invitation and create membership server-side
  const { data, error } = await (supabase as any).rpc('accept_workspace_invitation', { invite_token: token })
  if (error) throw new Error(error.message)
  const row = (Array.isArray(data) ? data[0] : data) as { workspace_id: string; name: string; owner_id: string }
  if (!row) throw new Error('Invitation not found or expired')

  // Best-effort: persist member's email and name to workspace_members for this workspace
  try {
    const workspaceId = row.workspace_id
    const uid = user.id
    const email = user.email ?? null
    // Try app user profile for display name; fallback to profiles.full_name
    let display: string | null = null
    try {
      const { data: up } = await supabase.from('users').select('display_name').eq('id', uid).maybeSingle<any>()
      display = (up?.display_name as string | null) ?? null
    } catch {}
    if (!display) {
      try {
        const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', uid).maybeSingle<any>()
        display = (prof?.full_name as string | null) ?? null
      } catch {}
    }

    // Try to update using likely column names; ignore if columns not present
    try {
      await supabase
        .from('workspace_members')
        .update({ member_email: email, member_name: display } as any)
        .eq('workspace_id', workspaceId)
        .eq('user_id', uid)
    } catch {}
    try {
      await supabase
        .from('workspace_members')
        .update({ email: email, name: display } as any)
        .eq('workspace_id', workspaceId)
        .eq('user_id', uid)
    } catch {}
  } catch {}
  return { workspace: { id: row.workspace_id, name: row.name, owner_id: row.owner_id } }
}

export async function searchUsersByEmailLike(term: string): Promise<Array<{ id: string; email: string }>> {
  const supabase = createClient()
  const t = term.trim()
  if (!t) return []
  const { data, error } = await (supabase as SupabaseClient).rpc('search_auth_users', { q: t })
  if (error) throw new Error(error.message)
  return (data ?? []).filter((u: any) => !!u.email && !!u.id)
}

export async function createThread(workspaceId: string, title?: string): Promise<MessageThread> {
  const supabase = createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr) throw new Error(authErr.message)
  requireUser(user)

  const { data: thread, error } = await supabase
    .from('message_threads')
    .insert({ workspace_id: workspaceId, title: title ?? null, created_by: user.id } as any)
    .select('*')
    .single<MessageThread>()
  if (error) throw new Error(error.message)

  // ensure creator is a participant
  await supabase
    .from('thread_participants')
    .upsert({ thread_id: thread.id, user_id: user.id, is_admin: true } as any, { onConflict: 'thread_id,user_id' })

  return thread
}

export async function sendMessage(threadId: string, workspaceId: string, body: string): Promise<Message> {
  const supabase = createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr) throw new Error(authErr.message)
  requireUser(user)
  const text = body.trim()
  if (!text) throw new Error('Message cannot be empty')

  const { data: message, error } = await supabase
    .from('messages')
    .insert({ thread_id: threadId, workspace_id: workspaceId, author_id: user.id, body: text } as any)
    .select('*')
    .single<Message>()
  if (error) throw new Error(error.message)

  // Determine recipients: participants if present, else all workspace members
  const { data: parts } = await supabase
    .from('thread_participants')
    .select('user_id')
    .eq('thread_id', threadId)
  let recipients: string[] = []
  if (parts && parts.length > 0) {
    recipients = parts.map((p: any) => p.user_id as string)
  } else {
    const { data: members, error: memErr } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
    if (memErr) throw new Error(memErr.message)
    recipients = (members ?? []).map((m: any) => m.user_id as string)
  }
  recipients = recipients.filter((id) => id && id !== user.id)
  if (recipients.length) {
    const rows = recipients.map((uid) => ({
      user_id: uid,
      type: 'message',
      ref_id: message.id,
      workspace_id: workspaceId,
      title: 'New message',
      body: text.slice(0, 140),
      is_read: false,
    }))
    await supabase.from('notifications').insert(rows as any)
  }
  return message
}

export async function assignTask(taskId: string, assigneeId: string): Promise<{ id: string }>
{
  const supabase = createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr) throw new Error(authErr.message)
  requireUser(user)

  // Load task to determine workspace
  const { data: taskRow, error: taskErr } = await supabase
    .from('tasks')
    .select('id, workspace_id, title')
    .eq('id', taskId)
    .maybeSingle<{ id: string; workspace_id: string | null; title: string | null }>()
  if (taskErr) throw new Error(taskErr.message)
  if (!taskRow) throw new Error('Task not found')

  const workspaceId = taskRow.workspace_id as string | null
  if (!workspaceId) throw new Error('Task workspace unknown')

  // Permission: only owner/admin can assign
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle<{ role: 'owner' | 'admin' | 'member' | 'viewer' }>()
  const role = membership?.role ?? null
  const isAdmin = role === 'owner' || role === 'admin'
  if (!isAdmin) throw new Error('Not allowed')

  // Additional rule: admins cannot assign tasks to themselves
  if (role === 'admin' && assigneeId === user.id) {
    throw new Error('Admins cannot assign themselves')
  }

  // Validate that the target assignee is a member of this workspace
  const { data: assigneeMembership } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', assigneeId)
    .maybeSingle<{ user_id: string }>()
  if (!assigneeMembership) {
    throw new Error('Assignee must be a member of the workspace')
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .update({ assignee_id: assigneeId } as any)
    .eq('id', taskId)
    .select('id, workspace_id, title')
    .maybeSingle<any>()
  if (error) throw new Error(error.message)
  if (!task) throw new Error('Task not found')

  await supabase.from('notifications').insert({
    user_id: assigneeId,
    type: 'task_assigned',
    ref_id: taskId,
    workspace_id: task.workspace_id ?? null,
    title: 'Task assigned',
    body: task.title ? `You were assigned: ${task.title}` : null,
    is_read: false,
  } as any)

  return { id: taskId }
}
