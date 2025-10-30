import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { validateBody, authenticateRequest } from '@/lib/validation/middleware'
import { acceptInvitationSchema } from '@/lib/validation/schemas'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase()
    const authResult = await authenticateRequest(supabase)
    if (!authResult.success) {
      console.error('[accept-invite] unauthorized request')
      return authResult.response
    }
    const userId = authResult.userId

    // Validate request body
    const bodyValidation = await validateBody(req, acceptInvitationSchema)
    if (!bodyValidation.success) {
      console.error('[accept-invite] validation failed')
      return bodyValidation.response
    }
    
    let { workspaceId, notificationId, token } = bodyValidation.data as { workspaceId?: string; notificationId?: string; token?: string }

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
      } catch {}
    }

    // If still missing, try resolving from invitation token
    if (!workspaceId && token) {
      try {
        const admin = createAdminClient()
        const { data: inv } = await admin
          .from('workspace_invitations')
          .select('workspace_id')
          .eq('token', token)
          .eq('status', 'pending')
          .maybeSingle()
        workspaceId = (inv?.workspace_id as string | null) || undefined
      } catch {}
    }

    console.log('[accept-invite] resolved', { userId, workspaceId, notificationId, hasToken: !!token })

    if (!workspaceId) {
      console.error('[accept-invite] no workspaceId could be resolved')
      return NextResponse.json({ error: 'Workspace not found for invitation', detail: { userId, notificationId, hasToken: !!token } }, { status: 400 })
    }

    // Ensure membership exists as 'member' (use admin to avoid RLS issues)
    const admin = createAdminClient()
    const { data: existing } = await admin
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle()
    if (!existing) {
      const { error: insErr } = await admin
        .from('workspace_members')
        .insert({ workspace_id: workspaceId, user_id: userId, role: 'member' } as any)
      if (insErr) {
        console.error('[accept-invite] membership insert error', insErr.message)
        return NextResponse.json({ error: insErr.message }, { status: 400 })
      }
    }

    if (notificationId) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId).eq('user_id', userId)
    }
    // Best-effort: mark related invitation row as accepted (by email if available)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const email = user?.email ?? null
      if (email) {
        await admin
          .from('workspace_invitations')
          .update({ status: 'accepted' } as any)
          .eq('workspace_id', workspaceId)
          .eq('email', email)
          .eq('status', 'pending')
      }
    } catch {}
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[accept-invite] unhandled error', e)
    return NextResponse.json({ error: 'Accept failed' }, { status: 500 })
  }
}
