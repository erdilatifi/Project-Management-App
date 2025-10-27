import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'

export async function POST(req: Request) {
  try {
    const { ids } = (await req.json()) as { ids: string[] }
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ updated: 0 }, { status: 200 })

    const supabase = await createServerSupabase()
    const { data: authRes, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authRes?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = authRes.user.id

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .in('id', ids)
      .select('id')
    if (error) throw error
    return NextResponse.json({ updated: (data ?? []).length })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to mark read' }, { status: 500 })
  }
}

