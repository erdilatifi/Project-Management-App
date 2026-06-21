import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

function getDb(supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const idsParam = url.searchParams.get('ids') || ''
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean)
    if (!ids.length) return NextResponse.json([])

    const supabase = await createServerSupabase()
    const { data: authRes } = await supabase.auth.getUser()
    if (!authRes?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb(supabase)
    const { data, error } = await db
      .from('profiles')
      .select('id, email')
      .in('id', ids)
      .not('email', 'is', null)

    if (error) {
      return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    }

    const out: Array<{ id: string; email: string }> = ((data ?? []) as Array<{ id: string; email: string | null }>)
      .filter((u) => !!u.email && !!u.id)
      .map((u) => ({ id: u.id, email: u.email! }))

    // For IDs that didn't have a profile entry, try looking up via auth admin API
    const foundIds = new Set(out.map((u) => u.id))
    const missingIds = ids.filter((id) => !foundIds.has(id))

    if (missingIds.length && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminClient = createAdminClient()
        // Fetch each missing user individually from auth
        const authUserResults = await Promise.allSettled(
          missingIds.map((id) => adminClient.auth.admin.getUserById(id))
        )
        authUserResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            const { data: userData } = result.value
            const user = userData?.user
            if (user?.id && user?.email) {
              out.push({ id: user.id, email: user.email })
            }
          }
        })
      } catch {}
    }

    return NextResponse.json(out)
  } catch (e) {
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}

