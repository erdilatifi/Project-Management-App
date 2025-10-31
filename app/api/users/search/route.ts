import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { authenticateRequest } from '@/lib/validation/middleware'
import { sanitizeSearchQuery, sanitizeEmail } from '@/lib/validation/sanitize'

export async function GET(req: Request) {
  try {
    // Ensure caller is authenticated (prevents open enumeration)
    const supabase = await createServerSupabase()
    const authResult = await authenticateRequest(supabase)
    if (!authResult.success) {
      return authResult.response
    }

    // Validate and sanitize search query
    const url = new URL(req.url)
    const rawQuery = url.searchParams.get('q') || ''
    const q = sanitizeSearchQuery(rawQuery)
    
    if (!q || q.length < 2) {
      return NextResponse.json([], { status: 200 })
    }

    // Search profiles by email using profiles.email column
    const { data, error } = await supabase
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
