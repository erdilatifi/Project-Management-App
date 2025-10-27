import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

function randToken(len = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnopqrstuvwxyz'
  let out = ''
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  arr.forEach((v) => (out += alphabet[v % alphabet.length]))
  return out
}

export async function POST(req: Request) {
  try {
    const { workspaceId, userId, email } = (await req.json()) as {
      workspaceId: string
      userId?: string
      email?: string
    }
    if (!workspaceId || (!userId && !email)) {
      return NextResponse.json({ error: 'workspaceId and userId or email required' }, { status: 400 })
    }

    // Ensure caller is authenticated
    const supabase = await createServerSupabase()
    const { data: authRes, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authRes?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const actorId = authRes.user.id

    const admin = createAdminClient()

    // Prevent auto-membership: ensure we do not already have a membership
    const { data: existingMember } = await admin
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId ?? '00000000-0000-0000-0000-000000000000')
      .maybeSingle()
    if (existingMember?.user_id) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
    }

    // Resolve invitee email if only userId provided
    let targetEmail = email ?? null
    if (!targetEmail && userId) {
      try {
        const { data: byId } = await (admin as any).auth.admin.getUserById(userId)
        targetEmail = byId?.user?.email ?? null
      } catch {}
    }

    // Create invitation row if table exists
    let token: string | null = null
    try {
      token = randToken(16)
      await admin.from('workspace_invitations').insert({
        workspace_id: workspaceId,
        email: targetEmail ?? null,
        invited_by: actorId,
        token,
        status: 'pending',
      } as any)
    } catch {
      // Table might not exist; continue without it
      token = null
    }

    // Load workspace for a nice title
    let wsName: string | null = null
    try {
      const { data: ws } = await admin
        .from('workspaces')
        .select('name')
        .eq('id', workspaceId)
        .maybeSingle()
      wsName = (ws?.name as string) ?? null
    } catch {}

    // Send in-app notification in our table to the invitee (if we have the user id)
    const targetId = userId || null
    if (targetId) {
      try {
        await admin.from('notifications').insert({
          user_id: targetId,
          type: 'workspace_invite',
          ref_id: workspaceId,
          workspace_id: workspaceId,
          title: wsName ? `You were invited to ${wsName}` : 'You were invited to a workspace',
          body: token ? `Use token ${token} to accept` : null,
          is_read: false,
        } as any)
      } catch {}
    }

    return NextResponse.json({ ok: true, token })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }
}
