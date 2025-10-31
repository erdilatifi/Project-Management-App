import { NextResponse } from 'next/server'
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

    // Fetch from profiles table using profiles.email column
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', ids)
      .not('email', 'is', null)

    if (error) {
      return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    }

    const out = ((data ?? []) as Array<{ id: string; email: string | null }>)
      .filter((u) => !!u.email && !!u.id)
      .map((u) => ({ id: u.id, email: u.email! }))

    return NextResponse.json(out)
  } catch (e) {
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
