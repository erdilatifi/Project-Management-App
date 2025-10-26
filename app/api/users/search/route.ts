import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerSupabase } from '@/utils/supabase/server'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const q = (url.searchParams.get('q') || '').trim().toLowerCase()
    if (!q) return NextResponse.json([], { status: 200 })

    // Ensure caller is authenticated (prevents open enumeration)
    const supabase = await createServerSupabase()
    const { data: authRes, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authRes?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: 'Service key not configured' }, { status: 500 })

    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    // If the query looks like an email, try direct lookup first
    const out: Array<{ id: string; email: string }> = []
    if (q.includes('@')) {
      try {
        const { data: byEmail } = await admin.auth.admin.getUserByEmail(q)
        if (byEmail?.user?.id && byEmail.user.email) {
          out.push({ id: byEmail.user.id, email: byEmail.user.email })
        }
      } catch {}
      if (out.length) return NextResponse.json(out.slice(0, 10))
    }

    // Fallback: scan first two pages and filter locally
    const perPage = 50
    for (let page = 1; page <= 2 && out.length < 10; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage })
      const matches = (data?.users ?? []).filter((u) => (u.email || '').toLowerCase().includes(q))
      for (const u of matches) {
        if (u.id && u.email && !out.some((x) => x.id === u.id)) out.push({ id: u.id, email: u.email })
        if (out.length >= 10) break
      }
    }
    return NextResponse.json(out.slice(0, 10))
  } catch (e) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
