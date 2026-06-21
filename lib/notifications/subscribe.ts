import type { SupabaseClient } from '@supabase/supabase-js'

export type NotificationPayload = {
  id: string
  type?: string | null
  title: string | null
  body: string | null
  created_at: string
  href?: string | null
  meta?: Record<string, any> | null
  workspace_id?: string | null
  ref_id?: string | null
  thread_id?: string | null
  message_id?: string | null
  task_id?: string | null
  project_id?: string | null
}

export function subscribeToNotifications(
  sb: SupabaseClient,
  userId: string,
  onReceive: (payload: NotificationPayload) => void
) {
  // Primary: Postgres changes on notifications table for this user
  const tableChannel = sb
    .channel(`notifications-table-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => {
        const row = payload.new as any
        console.log('[notification-subscribe] Received notification', row)
        onReceive({
          id: String(row.id),
          type: (row.type as string) ?? null,
          title: (row.title as string) ?? null,
          body: (row.body as string) ?? null,
          created_at: typeof row.created_at === 'string' && row.created_at
            ? row.created_at
            : new Date().toISOString(),
          workspace_id: (row.workspace_id as string) ?? null,
          ref_id: (row.ref_id as string) ?? null,
          thread_id: (row.thread_id as string) ?? null,
          message_id: (row.message_id as string) ?? null,
          task_id: (row.task_id as string) ?? null,
          project_id: (row.project_id as string) ?? null,
        })
      }
    )
    .subscribe()

  // Fallback broadcast channel if Postgres realtime is disabled on the table
  const custom = sb
    .channel(`user:${userId}:notifications`)
    .on('broadcast', { event: 'notification' }, (payload) => {
      const row = payload.payload as any
      console.log('[notification-subscribe] Received broadcast notification', row)
      onReceive({
        id: String(row.id),
        type: (row.type as string) ?? null,
        title: (row.title as string) ?? null,
        body: (row.body as string) ?? null,
        created_at: typeof row.created_at === 'string' && row.created_at
          ? row.created_at
          : new Date().toISOString(),
        workspace_id: (row.workspace_id as string) ?? null,
        ref_id: (row.ref_id as string) ?? null,
        thread_id: (row.thread_id as string) ?? null,
        message_id: (row.message_id as string) ?? null,
        task_id: (row.task_id as string) ?? null,
        project_id: (row.project_id as string) ?? null,
      })
    })
    .subscribe()

  return () => {
    sb.removeChannel(tableChannel)
    sb.removeChannel(custom)
  }
}
