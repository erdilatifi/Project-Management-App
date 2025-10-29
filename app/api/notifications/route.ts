import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { authenticateRequest } from '@/lib/validation/middleware'
import { sanitizeInteger } from '@/lib/validation/sanitize'

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabase()
    const authResult = await authenticateRequest(supabase)
    if (!authResult.success) {
      return authResult.response
    }
    const userId = authResult.userId

    // Validate and sanitize query parameters
    const url = new URL(req.url)
    const limit = Math.min(sanitizeInteger(url.searchParams.get('limit'), 20), 50)
    const cursor = url.searchParams.get('cursor') || null // ISO date string

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const [listRes, unreadRes] = await Promise.all([
      query,
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false),
    ])

    if (listRes.error) throw listRes.error

    const items = (listRes.data ?? []) as Array<{
      id: string
      type: string | null
      title: string | null
      body: string | null
      created_at: string
      is_read: boolean
      workspace_id: string | null
      ref_id: string | null
    }>

    const nextCursor = items.length === limit ? items[items.length - 1].created_at : null
    const unread = unreadRes.count ?? 0

    return NextResponse.json({ items, nextCursor, unread })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

