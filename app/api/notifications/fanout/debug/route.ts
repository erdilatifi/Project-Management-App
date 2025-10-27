import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET() {
  const result: any = { ok: false, checks: {} }
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    result.checks.serviceKeyPresent = !!serviceKey
    if (!serviceKey) {
      return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY missing', ...result }, { status: 500 })
    }

    // Auth check (caller must be signed in)
    const server = await createServerSupabase()
    const { data: authRes, error: authErr } = await server.auth.getUser()
    result.checks.authError = authErr?.message || null
    result.checks.authUserId = authRes?.user?.id || null
    if (!authRes?.user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized', ...result }, { status: 401 })
    }

    const admin = createAdminClient()

    // Table existence / simple select
    const sel = await admin.from('notifications').select('id').limit(1)
    result.checks.selectOk = !sel.error
    result.checks.selectError = sel.error?.message || null

    // Try insert + cleanup for this user
    const testRow = {
      user_id: authRes.user.id,
      type: 'task_update',
      ref_id: null,
      workspace_id: null,
      title: 'DEBUG_PING',
      body: 'debug',
      is_read: false,
    }
    const ins = await admin.from('notifications').insert(testRow as any).select('id').single<{ id: string }>()
    result.checks.insertOk = !ins.error
    result.checks.insertError = ins.error?.message || null
    result.insertedId = ins.data?.id || null

    if (ins.data?.id) {
      // delete it back
      const del = await admin.from('notifications').delete().eq('id', ins.data.id)
      result.checks.cleanupOk = !del.error
      result.checks.cleanupError = del.error?.message || null
    }

    result.ok = !!ins.data?.id
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (e: any) {
    result.error = e?.message || 'debug failed'
    return NextResponse.json(result, { status: 500 })
  }
}

