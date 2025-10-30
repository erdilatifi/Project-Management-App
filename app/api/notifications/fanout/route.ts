import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
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

export async function POST(req: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[fanout] Missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
    }

    const body = (await req.json()) as Partial<FanoutInput>
    if (!body?.type || !Array.isArray(body.recipients)) {
      console.error('[fanout] Invalid payload', { type: body?.type, hasRecipients: Array.isArray(body?.recipients) })
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const recipients = Array.from(new Set((body.recipients ?? []).filter(Boolean)))
    if (!recipients.length) {
      console.log('[fanout] No recipients to notify')
      return NextResponse.json({ ids: [] }, { status: 200 })
    }

    const sb = createAdminClient()
    const meta = body.meta ?? {}
    const title = titleByType(body.type as NotificationType, meta)
    const bodyText = subtitleByType(body.type as NotificationType, meta)
    const ref_id = body.taskId || body.threadId || body.messageId || body.projectId || null
    
    console.log('[fanout] Processing notification', { 
      type: body.type, 
      title, 
      bodyText, 
      recipients: recipients.length,
      workspaceId: body.workspaceId,
      threadId: body.threadId,
      messageId: body.messageId,
      ref_id
    })

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
        
        console.log('[fanout] Inserting notification for user', { uid, notificationData })
        
        const { data, error } = await sb
          .from('notifications')
          .insert(notificationData)
          .select('id')
          .single<{ id: string }>()
          
        if (error) {
          console.error('[fanout] Insert error for user', { uid, error: error.message })
          throw error
        }
        
        if (data?.id) {
          console.log('[fanout] Successfully inserted notification', { uid, notificationId: data.id })
          ids.push(data.id)
        }
      } catch (e: any) {
        errors[uid] = e?.message || String(e)
      }
    }

    if (!ids.length) {
      console.error('[fanout] No notifications inserted', { recipients, errors })
      return NextResponse.json(
        { error: 'No notifications inserted', recipients, errors },
        { status: 500 }
      )
    }

    console.log('[fanout] Successfully created notifications', { count: ids.length, hasErrors: Object.keys(errors).length > 0 })
    return NextResponse.json(
      { ids, errors: Object.keys(errors).length ? errors : undefined },
      { status: 200 }
    )
  } catch (e: any) {
    console.error('[fanout] Unhandled error', e)
    return NextResponse.json({ error: e?.message || 'Fanout failed' }, { status: 500 })
  }
}
