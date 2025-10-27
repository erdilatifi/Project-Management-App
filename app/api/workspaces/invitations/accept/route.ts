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

    // Upsert membership as member (use admin to avoid RLS issues)
    const admin = createAdminClient()
    const { error: upErr } = await admin
      .from('workspace_members')
      .upsert({ workspace_id: workspaceId, user_id: userId, role: 'member' } as any, { onConflict: 'workspace_id,user_id' })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })

    if (notificationId) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId).eq('user_id', userId)
    }
    // Best-effort: mark related invitation row as accepted (by email if available)
    try {
      const email = authRes.user.email ?? null
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
    return NextResponse.json({ error: 'Accept failed' }, { status: 500 })
  }
}
