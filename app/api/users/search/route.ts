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
    const q = sanitizeSearchQuery(rawQuery).toLowerCase()
    
    if (!q || q.length < 2) {
      return NextResponse.json([], { status: 200 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: 'Service key not configured' }, { status: 500 })

    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    // Scan users and filter by search query
    const out: Array<{ id: string; email: string }> = []
    const perPage = 50
    
    // Search through first two pages
    for (let page = 1; page <= 2 && out.length < 10; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage })
      const matches = (data?.users ?? []).filter((u) => (u.email || '').toLowerCase().includes(q))
      for (const u of matches) {
        if (u.id && u.email && !out.some((x) => x.id === u.id)) {
          out.push({ id: u.id, email: u.email })
        }
        if (out.length >= 10) break
      }
    }
    return NextResponse.json(out.slice(0, 10))
  } catch (e) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
