import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { validateBody, authenticateRequest } from '@/lib/validation/middleware'
import { workspaceIdSchema } from '@/lib/validation/schemas'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase()
    const authResult = await authenticateRequest(supabase)
    if (!authResult.success) {
      return authResult.response
    }
    const userId = authResult.userId

    // Validate request body
    const bodyValidation = await validateBody(req, workspaceIdSchema)
    if (!bodyValidation.success) {
      return bodyValidation.response
    }
    
    const { workspaceId } = bodyValidation.data

    const admin = createAdminClient()

    // Delete membership
    const { error: delErr } = await admin
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 })

    // Notify owners/admins that user left
    try {
      const { data: owners } = await admin
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
        await admin.from('notifications').insert(rows as any)
      }
    } catch {}

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to leave workspace' }, { status: 500 })
  }
}
