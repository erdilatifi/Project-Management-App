import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { validateBody, authenticateRequest } from '@/lib/validation/middleware'
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
    const supabase = await createServerSupabase()
    const authResult = await authenticateRequest(supabase)
    if (!authResult.success) {
      return authResult.response
    }
    const actorId = authResult.userId

    const bodyValidation = await validateBody(req, inviteUserSchema)
    if (!bodyValidation.success) {
      return bodyValidation.response
    }

    const { workspaceId } = bodyValidation.data
    let { userId } = bodyValidation.data
    const { email } = bodyValidation.data

    const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase

    const requestedEmail = email ? sanitizeEmail(email) : ''
    if (email && !requestedEmail) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 })
    }
    let targetEmail: string | null = requestedEmail || null

    const normalizeProfileEmail = (value: string | null | undefined) => {
      if (!value) return null
      const sanitized = sanitizeEmail(value)
      return sanitized || null
    }

    const { data: actorMember, error: actorMemberErr } = await db
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', actorId)
      .maybeSingle()

    if (actorMemberErr) {
      console.error('[invite] Failed to verify workspace role', actorMemberErr)
      return NextResponse.json({ error: 'Unable to verify workspace permissions' }, { status: 500 })
    }

    let actorRole = (actorMember?.role as string | null) ?? null
    if (!actorRole) {
      const { data: workspaceOwner, error: workspaceOwnerErr } = await db
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .maybeSingle()

      if (workspaceOwnerErr) {
        console.error('[invite] Failed to verify workspace owner', workspaceOwnerErr)
        return NextResponse.json({ error: 'Unable to verify workspace permissions' }, { status: 500 })
      }
      if (workspaceOwner?.owner_id === actorId) {
        actorRole = 'owner'
      }
    }

    if (actorRole !== 'owner' && actorRole !== 'admin') {
      return NextResponse.json({ error: 'Only workspace owners and admins can invite members' }, { status: 403 })
    }

    if (userId) {
      const { data: profile, error: profileErr } = await db
        .from('profiles')
        .select('id, email')
        .eq('id', userId)
        .maybeSingle()

      if (profileErr) {
        console.error('[invite] Failed to resolve profile by id', profileErr)
        return NextResponse.json({ error: 'Failed to resolve user profile' }, { status: 500 })
      }
      if (!profile) {
        return NextResponse.json({ error: 'No user found with this identifier' }, { status: 404 })
      }

      const profileEmail = normalizeProfileEmail(profile.email as string | null)
      if (profileEmail) {
        targetEmail = profileEmail
      } else if (targetEmail) {
        const { error: backfillErr } = await db.from('profiles').update({ email: targetEmail } as any).eq('id', userId)
        if (backfillErr) {
          console.warn('[invite] Failed to backfill profile email', backfillErr)
        }
      } else {
        return NextResponse.json(
          { error: 'User profile is missing an email address. Ask the user to complete their profile.' },
          { status: 422 }
        )
      }
    } else if (targetEmail) {
      const { data: profile, error: profileErr } = await db
        .from('profiles')
        .select('id, email')
        .ilike('email', targetEmail)
        .maybeSingle()

      if (profileErr) {
        console.error('[invite] Failed to resolve profile by email', profileErr)
        return NextResponse.json({ error: 'Failed to resolve user profile' }, { status: 500 })
      }
      if (!profile) {
        return NextResponse.json({ error: 'No user found with this email' }, { status: 404 })
      }

      userId = profile.id as string
      const profileEmail = normalizeProfileEmail(profile.email as string | null)
      targetEmail = profileEmail ?? targetEmail
    } else {
      return NextResponse.json({ error: 'Either userId or email is required' }, { status: 400 })
    }

    if (!userId || !targetEmail) {
      return NextResponse.json({ error: 'Unable to resolve user for invitation' }, { status: 422 })
    }

    const { data: existingMember, error: existingMemberErr } = await db
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingMemberErr) {
      console.error('[invite] Failed to check existing membership', existingMemberErr)
      return NextResponse.json({ error: 'Unable to check workspace membership' }, { status: 500 })
    }
    if (existingMember?.user_id) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
    }

    const token = randToken(16)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { error: invitationErr } = await db
      .from('workspace_invitations')
      .insert({
        workspace_id: workspaceId,
        email: targetEmail,
        invited_by: actorId,
        token,
        status: 'pending',
        expires_at: expiresAt,
      } as any)

    if (invitationErr) {
      console.error('[invite] Failed to insert invitation', invitationErr)
      const message = invitationErr.code === '23505'
        ? 'A pending invitation already exists for this user'
        : invitationErr.message
      return NextResponse.json({ error: message }, { status: invitationErr.code === '23505' ? 409 : 500 })
    }

    let wsName: string | null = null
    try {
      const { data: ws } = await db
        .from('workspaces')
        .select('name')
        .eq('id', workspaceId)
        .maybeSingle()
      wsName = (ws?.name as string) ?? null
    } catch {}

    const { error: notificationErr } = await db.from('notifications').insert({
      user_id: userId,
      type: 'workspace_invite',
      ref_id: workspaceId,
      workspace_id: workspaceId,
      title: wsName ? `You were invited to ${wsName}` : 'You were invited to a workspace',
      body: `Use token ${token} to accept`,
      is_read: false,
    } as any)

    if (notificationErr) {
      console.warn('[invite] Failed to insert notification', notificationErr)
    }

    return NextResponse.json({ ok: true, token })
  } catch (e) {
    console.error('[invite] unhandled error', e)
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }
}
