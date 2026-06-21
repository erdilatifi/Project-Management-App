import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { validateBody, authenticateRequest } from '@/lib/validation/middleware'
import { acceptInvitationSchema } from '@/lib/validation/schemas'
import { sanitizeEmail } from '@/lib/validation/sanitize'

function getDb(supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase
}

async function getUserEmail(supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
  const { data: { user } } = await supabase.auth.getUser()
  return sanitizeEmail(user?.email ?? '') || null
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase()
    const authResult = await authenticateRequest(supabase)
    if (!authResult.success) {
      console.error('[accept-invite] unauthorized request')
      return authResult.response
    }
    const userId = authResult.userId
    const email = await getUserEmail(supabase)

    if (!email) {
      return NextResponse.json({ error: 'Your account is missing an email address' }, { status: 422 })
    }

    const bodyValidation = await validateBody(req, acceptInvitationSchema)
    if (!bodyValidation.success) {
      console.error('[accept-invite] validation failed')
      return bodyValidation.response
    }

    let { workspaceId } = bodyValidation.data as { workspaceId?: string; notificationId?: string; invitationId?: string; token?: string }
    const { notificationId, invitationId, token } = bodyValidation.data as { workspaceId?: string; notificationId?: string; invitationId?: string; token?: string }
    const db = getDb(supabase)

    let inviteFilterApplied = false
    let inviteId: string | undefined = invitationId

    if (!workspaceId && notificationId) {
      const { data: notif, error: notifErr } = await supabase
        .from('notifications')
        .select('workspace_id, ref_id, user_id')
        .eq('id', notificationId)
        .maybeSingle()
      if (notifErr) {
        console.error('[accept-invite] failed to resolve workspaceId from notification', notifErr)
      }
      if (notif && notif.user_id === userId) {
        workspaceId = (notif.workspace_id as string | null) || (notif.ref_id as string | null) || undefined
      }
    }

    let invitationQuery = db
      .from('workspace_invitations')
      .select('id, workspace_id, email, status, expires_at')
      .eq('status', 'pending')

    if (inviteId) {
      invitationQuery = invitationQuery.eq('id', inviteId)
      inviteFilterApplied = true
    }
    if (token) {
      invitationQuery = invitationQuery.eq('token', token)
      inviteFilterApplied = true
    }
    if (workspaceId) {
      invitationQuery = invitationQuery.eq('workspace_id', workspaceId)
      inviteFilterApplied = true
    }
    invitationQuery = invitationQuery.ilike('email', email)

    if (!inviteFilterApplied) {
      return NextResponse.json({ error: 'Invitation identifier is required' }, { status: 400 })
    }

    const { data: invitation, error: invitationErr } = await invitationQuery.maybeSingle()
    if (invitationErr) {
      console.error('[accept-invite] invitation lookup error', invitationErr)
      return NextResponse.json({ error: 'Failed to load invitation' }, { status: 500 })
    }
    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found for your email address' }, { status: 404 })
    }

    workspaceId = (invitation.workspace_id as string | null) || workspaceId
    inviteId = invitation.id as string

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace not found for invitation' }, { status: 400 })
    }

    const expiresAt = invitation.expires_at as string | null
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      await db.from('workspace_invitations').update({ status: 'expired' } as any).eq('id', inviteId)
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
    }

    const { data: existing, error: existingErr } = await db
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle()
    if (existingErr) {
      console.error('[accept-invite] membership lookup error', existingErr)
      return NextResponse.json({ error: 'Failed to check workspace membership' }, { status: 500 })
    }

    if (!existing) {
      const { error: insErr } = await db
        .from('workspace_members')
        .insert({ workspace_id: workspaceId, user_id: userId, role: 'member' } as any)
      if (insErr) {
        console.error('[accept-invite] membership insert error', insErr)
        return NextResponse.json({ error: insErr.message }, { status: 400 })
      }
    }

    const { error: updateInviteErr } = await db
      .from('workspace_invitations')
      .update({ status: 'accepted' } as any)
      .eq('id', inviteId)
      .ilike('email', email)
    if (updateInviteErr) {
      console.warn('[accept-invite] failed to update invitation status', updateInviteErr)
    }

    if (notificationId) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId).eq('user_id', userId)
    }

    let workspaceName: string | null = null
    try {
      const { data: ws } = await db.from('workspaces').select('name').eq('id', workspaceId).maybeSingle()
      workspaceName = (ws?.name as string | null) ?? null
    } catch {}

    return NextResponse.json({ ok: true, workspaceId, workspaceName })
  } catch (e) {
    console.error('[accept-invite] unhandled error', e)
    return NextResponse.json({ error: 'Accept failed' }, { status: 500 })
  }
}
