import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { authenticateRequest } from '@/lib/validation/middleware'
import { sanitizeSearchQuery } from '@/lib/validation/sanitize'

function getDb(supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase
}

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabase()
    const authResult = await authenticateRequest(supabase)
    if (!authResult.success) {
      return authResult.response
    }

    const url = new URL(req.url)
    const rawQuery = url.searchParams.get('q') || ''
    const q = sanitizeSearchQuery(rawQuery)

    if (!q || q.length < 2) {
      return NextResponse.json([], { status: 200 })
    }

    const db = getDb(supabase)
    const { data, error } = await db
      .from('profiles')
      .select('id, email')
      .ilike('email', `%${q}%`)
      .not('email', 'is', null)
      .limit(10)

    if (error) {
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    const out = ((data ?? []) as Array<{ id: string; email: string | null }>)
      .filter((u) => !!u.email && !!u.id)
      .map((u) => ({ id: u.id, email: u.email! }))
      .slice(0, 10)

    return NextResponse.json(out)
  } catch (e) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
