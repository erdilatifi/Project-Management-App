import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { authenticateRequest } from '@/lib/validation/middleware'
import { sanitizeInteger } from '@/lib/validation/sanitize'

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabase()
    const authResult = await authenticateRequest(supabase)
    if (!authResult.success) {
      console.error('[notifications] unauthorized request')
      return authResult.response
    }
    const userId = authResult.userId

    const { data: { user } } = await supabase.auth.getUser()
    const userEmail = user?.email ? sanitizeEmail(user.email) : null

    // Validate and sanitize query parameters
    const url = new URL(req.url)
    const limit = Math.min(sanitizeInteger(url.searchParams.get('limit'), 20), 50)
    const cursor = url.searchParams.get('cursor') || null // ISO date string

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const promises: any[] = [
      query,
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false),
    ]

    if (userEmail && !cursor) {
      promises.push(
        supabase
          .from('workspace_invitations')
          .select('id, workspace_id, created_at, workspaces(name)')
          .ilike('email', userEmail)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
      )
    }

    const results = await Promise.all(promises)
    const listRes = results[0]
    const unreadRes = results[1]
    const invitesRes = results[2]

    if (listRes.error) {
      console.error('[notifications] database error', listRes.error)
      throw listRes.error
    }

    let items = (listRes.data ?? []) as Array<{
      id: string
      type: string | null
      title: string | null
      body: string | null
      created_at: string
      is_read: boolean
      workspace_id: string | null
      ref_id: string | null
      thread_id: string | null
      message_id: string | null
      task_id: string | null
      project_id: string | null
    }>

    if (invitesRes && !invitesRes.error && invitesRes.data) {
      const inviteItems = invitesRes.data.map((inv: any) => ({
        id: inv.id,
        type: 'workspace_invite',
        title: inv.workspaces?.name ? `You were invited to ${inv.workspaces.name}` : 'You were invited to a workspace',
        body: 'Open your invitations to accept or decline.',
        created_at: inv.created_at,
        is_read: false,
        workspace_id: inv.workspace_id,
        ref_id: inv.workspace_id,
        thread_id: null,
        message_id: null,
        task_id: null,
        project_id: null,
      }))
      
      // Filter out any invites that already have a corresponding notification
      const existingRefs = new Set(items.filter(i => i.type === 'workspace_invite').map(i => i.ref_id))
      const uniqueInvites = inviteItems.filter(i => !existingRefs.has(i.workspace_id))
      
      items = [...uniqueInvites, ...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    const nextCursor = items.length >= limit ? items[items.length - 1].created_at : null
    const unread = (unreadRes.count ?? 0) + (invitesRes?.data?.length ?? 0)

    return NextResponse.json({ items: items.slice(0, limit), nextCursor, unread })
  } catch (e: any) {
    console.error('[notifications] unhandled error', e)
    return NextResponse.json({ error: e?.message ?? 'Failed to fetch notifications' }, { status: 500 })
  }
}

