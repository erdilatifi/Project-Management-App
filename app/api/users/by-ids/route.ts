import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerSupabase } from '@/utils/supabase/server'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const idsParam = url.searchParams.get('ids') || ''
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean)
    if (!ids.length) return NextResponse.json([])

    const supabase = await createServerSupabase()
    const { data: authRes } = await supabase.auth.getUser()
    if (!authRes?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: 'Service key not configured' }, { status: 500 })

    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
    const out: Array<{ id: string; email: string }> = []
    // Fetch individually to avoid huge pages; this is fine for small lists
    await Promise.all(ids.map(async (id) => {
      try {
        const { data } = await admin.auth.admin.getUserById(id)
        if (data?.user?.id && data.user.email) out.push({ id: data.user.id, email: data.user.email })
      } catch {}
    }))
    return NextResponse.json(out)
  } catch (e) {
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
