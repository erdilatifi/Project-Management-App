import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { authenticateRequest } from '@/lib/validation/middleware'
import { titleByType, subtitleByType, type NotificationType } from '@/lib/notifications/types'

type FanoutInput = {
  type: NotificationType
  actorId: string
  recipients: string[]
  workspaceId?: string | null
  projectId?: string | null
  taskId?: string | null
  threadId?: string | null
  messageId?: string | null
  meta?: Record<string, any>
}

function getDb(supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase()
    const authResult = await authenticateRequest(supabase)
    if (!authResult.success) {
      console.error('[fanout] unauthorized request')
      return authResult.response
    }
    const userId = authResult.userId

    const body = (await req.json()) as Partial<FanoutInput>
    if (!body?.type || !Array.isArray(body.recipients)) {
      console.error('[fanout] Invalid payload', { type: body?.type, hasRecipients: Array.isArray(body?.recipients) })
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    if (body.actorId && body.actorId !== userId) {
      return NextResponse.json({ error: 'actorId must match the signed-in user' }, { status: 403 })
    }

    const recipients = Array.from(new Set((body.recipients ?? []).filter(Boolean))).filter((id) => id !== userId)
    if (!recipients.length) {
      console.log('[fanout] No recipients to notify')
      return NextResponse.json({ ids: [] }, { status: 200 })
    }

    const sb = getDb(supabase)
    const meta = body.meta ?? {}
    const title = titleByType(body.type as NotificationType, meta)
    const bodyText = subtitleByType(body.type as NotificationType, meta)
    const ref_id = body.taskId || body.threadId || body.messageId || body.projectId || null
    const ids: string[] = []
    const errors: Record<string, string> = {}
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    for (const uid of recipients) {
      try {
        if (meta?.dedupeKey) {
          const { data: existing, error: exErr } = await sb
            .from('notifications')
            .select('id, created_at')
            .eq('user_id', uid)
            .eq('title', title)
            .gt('created_at', fiveMinAgo)
            .limit(1)
          if (!exErr && existing?.length) continue
        }

        const notificationData = {
          user_id: uid,
          type: body.type,
          title,
          body: bodyText,
          workspace_id: body.workspaceId ?? null,
          project_id: body.projectId ?? null,
          task_id: body.taskId ?? null,
          thread_id: body.threadId ?? null,
          message_id: body.messageId ?? null,
          ref_id,
          meta,
          is_read: false,
        }

        const { data, error } = await sb
          .from('notifications')
          .insert(notificationData)
          .select('*')
          .single()

        if (error) {
          console.error('[fanout] Insert error for user', { uid, error })
          throw error
        }

        if (data?.id) {
          ids.push(String(data.id))
          try {
            await new Promise<void>((resolve) => {
              const channel = sb.channel(`user:${uid}:notifications`)
              channel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                  channel.send({
                    type: 'broadcast',
                    event: 'notification',
                    payload: data
                  }).finally(() => {
                    sb.removeChannel(channel)
                    resolve()
                  })
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                  sb.removeChannel(channel)
                  resolve()
                }
              })
              setTimeout(() => resolve(), 1500)
            })
          } catch (err) {
            console.error('[fanout] Failed to broadcast notification', err)
          }
        }
      } catch (e: any) {
        errors[uid] = e?.message || String(e)
      }
    }

    if (!ids.length && Object.keys(errors).length) {
      console.error('[fanout] No notifications inserted', { recipients, errors })
      return NextResponse.json({ error: 'No notifications inserted', errors }, { status: 500 })
    }

    return NextResponse.json({ ids, errors: Object.keys(errors).length ? errors : undefined }, { status: 200 })
  } catch (e: any) {
    console.error('[fanout] Unhandled error', e)
    return NextResponse.json({ error: e?.message || 'Fanout failed' }, { status: 500 })
  }
}
