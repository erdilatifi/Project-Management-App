import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { validateBody, authenticateRequest } from '@/lib/validation/middleware'
import { declineInvitationSchema } from '@/lib/validation/schemas'
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
      console.error('[decline-invite] unauthorized request')
      return authResult.response
    }
    const userId = authResult.userId
    const email = await getUserEmail(supabase)

    if (!email) {
      return NextResponse.json({ error: 'Your account is missing an email address' }, { status: 422 })
    }

    const bodyValidation = await validateBody(req, declineInvitationSchema)
    if (!bodyValidation.success) {
      console.error('[decline-invite] validation failed')
      return bodyValidation.response
    }

    let { workspaceId } = bodyValidation.data as { workspaceId?: string; notificationId?: string; invitationId?: string }
    const { notificationId, invitationId } = bodyValidation.data as { workspaceId?: string; notificationId?: string; invitationId?: string }
    const db = getDb(supabase)

    if (!workspaceId && notificationId) {
      const { data: notif, error: notifErr } = await supabase
        .from('notifications')
        .select('workspace_id, ref_id, user_id')
        .eq('id', notificationId)
        .maybeSingle()
      if (notifErr) {
        console.error('[decline-invite] failed to resolve workspaceId from notification', notifErr)
      }
      if (notif && notif.user_id === userId) {
        workspaceId = (notif.workspace_id as string | null) || (notif.ref_id as string | null) || undefined
      }
    }

    let invitationQuery = db
      .from('workspace_invitations')
      .select('id, workspace_id, email, status')
      .eq('status', 'pending')
      .ilike('email', email)

    if (invitationId) {
      invitationQuery = invitationQuery.eq('id', invitationId)
    } else if (workspaceId) {
      invitationQuery = invitationQuery.eq('workspace_id', workspaceId)
    } else {
      return NextResponse.json({ error: 'Invitation identifier is required' }, { status: 400 })
    }

    const { data: invitation, error: invitationErr } = await invitationQuery.maybeSingle()
    if (invitationErr) {
      console.error('[decline-invite] invitation lookup error', invitationErr)
      return NextResponse.json({ error: 'Failed to load invitation' }, { status: 500 })
    }
    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found for your email address' }, { status: 404 })
    }

    const { error: updateInviteErr } = await db
      .from('workspace_invitations')
      .update({ status: 'revoked' } as any)
      .eq('id', invitation.id)
      .ilike('email', email)
    if (updateInviteErr) {
      console.error('[decline-invite] failed to update invitation status', updateInviteErr)
      return NextResponse.json({ error: updateInviteErr.message }, { status: 400 })
    }

    if (notificationId) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId).eq('user_id', userId)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[decline-invite] unhandled error', e)
    return NextResponse.json({ error: 'Decline failed' }, { status: 500 })
  }
}
