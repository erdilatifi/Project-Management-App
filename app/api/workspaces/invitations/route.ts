import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { validateBody, authenticateRequest, errorResponse } from '@/lib/validation/middleware'
import { inviteUserSchema } from '@/lib/validation/schemas'
import { sanitizeEmail } from '@/lib/validation/sanitize'

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
    // Ensure caller is authenticated
    const supabase = await createServerSupabase()
    const authResult = await authenticateRequest(supabase)
    if (!authResult.success) {
      return authResult.response
    }
    const actorId = authResult.userId

    // Validate request body
    const bodyValidation = await validateBody(req, inviteUserSchema)
    if (!bodyValidation.success) {
      return bodyValidation.response
    }
    
    const { workspaceId, userId, email } = bodyValidation.data

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
    let targetEmail = email ? sanitizeEmail(email) : null
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
