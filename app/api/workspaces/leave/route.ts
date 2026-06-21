import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { validateBody, authenticateRequest } from '@/lib/validation/middleware'
import { workspaceIdSchema } from '@/lib/validation/schemas'

function getDb(supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase()
    const authResult = await authenticateRequest(supabase)
    if (!authResult.success) {
      return authResult.response
    }
    const userId = authResult.userId

    const bodyValidation = await validateBody(req, workspaceIdSchema)
    if (!bodyValidation.success) {
      return bodyValidation.response
    }

    const { workspaceId } = bodyValidation.data
    const db = getDb(supabase)

    const { data: workspace, error: wsErr } = await db
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .maybeSingle()
    if (wsErr) {
      return NextResponse.json({ error: 'Failed to verify workspace' }, { status: 500 })
    }
    if (workspace?.owner_id === userId) {
      return NextResponse.json(
        { error: 'Workspace owners cannot leave. Transfer ownership or delete the workspace first.' },
        { status: 403 },
      )
    }

    const { error: delErr } = await db
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 })

    try {
      const { data: owners } = await db
        .from('workspace_members')
        .select('user_id, role')
        .eq('workspace_id', workspaceId)
        .in('role', ['owner', 'admin'] as any)
      const recipients = (owners ?? []).map((r: any) => String(r.user_id)).filter((id) => id && id !== userId)
      if (recipients.length) {
        const rows = recipients.map((uid) => ({
          user_id: uid,
          type: 'workspace_member_left',
          ref_id: workspaceId,
          workspace_id: workspaceId,
          title: 'A member left the workspace',
          body: null,
          is_read: false,
        }))
        const { error: notifyErr } = await db.from('notifications').insert(rows as any)
        if (notifyErr) console.warn('[leave-workspace] failed to notify owners/admins', notifyErr)
      }
    } catch (e) {
      console.warn('[leave-workspace] notification fanout failed', e)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[leave-workspace] unhandled error', e)
    return NextResponse.json({ error: 'Failed to leave workspace' }, { status: 500 })
  }
}
