import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { validateBody, authenticateRequest } from '@/lib/validation/middleware'
import { declineInvitationSchema } from '@/lib/validation/schemas'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase()
    const authResult = await authenticateRequest(supabase)
    if (!authResult.success) {
      console.error('[decline-invite] unauthorized request')
      return authResult.response
    }
    const userId = authResult.userId

    // Validate request body
    const bodyValidation = await validateBody(req, declineInvitationSchema)
    if (!bodyValidation.success) {
      console.error('[decline-invite] validation failed')
      return bodyValidation.response
    }
    
    let { workspaceId, notificationId } = bodyValidation.data as { workspaceId?: string; notificationId?: string }

    // If workspaceId missing, try resolving from notification
    if (!workspaceId && notificationId) {
      try {
        const { data: notif } = await supabase
          .from('notifications')
          .select('workspace_id, ref_id, user_id')
          .eq('id', notificationId)
          .maybeSingle()
        if (notif && notif.user_id === userId) {
          workspaceId = (notif.workspace_id as string | null) || (notif.ref_id as string | null) || undefined
        }
      } catch (e) {
        console.error('[decline-invite] failed to resolve workspaceId from notification', e)
      }
    }

    if (!workspaceId) {
      console.error('[decline-invite] no workspaceId could be resolved')
      return NextResponse.json({ error: 'Workspace not found for invitation' }, { status: 400 })
    }

    if (notificationId) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId).eq('user_id', userId)
    }
    
    // Best-effort: mark related invitation row as revoked
    try {
      const admin = createAdminClient()
      const { data: { user } } = await supabase.auth.getUser()
      const email = user?.email ?? null
      if (email) {
        await admin
          .from('workspace_invitations')
          .update({ status: 'revoked' } as any)
          .eq('workspace_id', workspaceId)
          .eq('email', email)
          .eq('status', 'pending')
      }
    } catch (e) {
      console.error('[decline-invite] failed to update invitation status', e)
    }
    
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[decline-invite] unhandled error', e)
    return NextResponse.json({ error: 'Decline failed' }, { status: 500 })
  }
}
