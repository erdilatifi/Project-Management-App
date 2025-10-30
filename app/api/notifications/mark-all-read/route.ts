import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { authenticateRequest } from '@/lib/validation/middleware'

export async function POST() {
  try {
    const supabase = await createServerSupabase()
    const authResult = await authenticateRequest(supabase)
    if (!authResult.success) {
      console.error('[mark-all-read] unauthorized request')
      return authResult.response
    }
    const userId = authResult.userId

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    if (error) {
      console.error('[mark-all-read] database error', error)
      throw error
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[mark-all-read] unhandled error', e)
    return NextResponse.json({ error: e?.message ?? 'Failed to mark all read' }, { status: 500 })
  }
}

