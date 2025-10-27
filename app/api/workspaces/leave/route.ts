import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(req: Request) {
  try {
    const { workspaceId } = (await req.json()) as { workspaceId: string }
    if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

    const supabase = await createServerSupabase()
    const { data: authRes, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authRes?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = authRes.user.id

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
