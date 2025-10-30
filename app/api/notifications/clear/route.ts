import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { authenticateRequest } from '@/lib/validation/middleware'

export async function POST() {
  try {
    const supabase = await createServerSupabase()
    const authResult = await authenticateRequest(supabase)
    if (!authResult.success) {
      console.error('[clear-notifications] unauthorized request')
      return authResult.response
    }
    const userId = authResult.userId

    const admin = createAdminClient()
    const { error: delErr } = await admin.from('notifications').delete().eq('user_id', userId)
    if (delErr) {
      console.error('[clear-notifications] database error', delErr)
      return NextResponse.json({ error: delErr.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[clear-notifications] unhandled error', e)
    return NextResponse.json({ error: e?.message ?? 'Failed to clear notifications' }, { status: 500 })
  }
}

