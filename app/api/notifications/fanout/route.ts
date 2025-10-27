import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { titleByType, type NotificationType } from '@/lib/notifications/types'

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
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
    }

    const body = (await req.json()) as Partial<FanoutInput>
    if (!body?.type || !Array.isArray(body.recipients)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const recipients = Array.from(new Set((body.recipients ?? []).filter(Boolean)))
    if (!recipients.length) return NextResponse.json({ ids: [] }, { status: 200 })

    const sb = createAdminClient()
    const meta = body.meta ?? {}
    const title = titleByType(body.type as NotificationType, meta)
    const bodyText = typeof meta.subtitle === 'string' && meta.subtitle.trim() ? meta.subtitle : null
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

        const { data, error } = await sb
          .from('notifications')
          .insert({
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
          })
          .select('id')
          .single<{ id: string }>()
        if (error) throw error
        if (data?.id) ids.push(data.id)
      } catch (e: any) {
        errors[uid] = e?.message || String(e)
      }
    }

    if (!ids.length) {
      return NextResponse.json(
        { error: 'No notifications inserted', recipients, errors },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { ids, errors: Object.keys(errors).length ? errors : undefined },
      { status: 200 }
    )
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Fanout failed' }, { status: 500 })
  }
}
