import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(req: Request) {
  try {
    const { workspaceId, notificationId } = (await req.json()) as { workspaceId: string; notificationId?: string }
    if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

    const supabase = await createServerSupabase()
    const { data: authRes, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authRes?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = authRes.user.id

    if (notificationId) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId).eq('user_id', userId)
    }
    // Best-effort: mark related invitation row as revoked
    try {
      const admin = createAdminClient()
      const email = authRes.user.email ?? null
      if (email) {
        await admin
          .from('workspace_invitations')
          .update({ status: 'revoked' } as any)
          .eq('workspace_id', workspaceId)
          .eq('email', email)
          .eq('status', 'pending')
      }
    } catch {}
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Decline failed' }, { status: 500 })
  }
}
