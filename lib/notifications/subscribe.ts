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
          id: row.id as string,
          type: (row.type as string) ?? null,
          title: (row.title as string) ?? null,
          body: (row.body as string) ?? null,
          created_at: row.created_at as string,
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

  // Fallback place-holder for custom channel if later enabled server-side
  // const custom = sb
  //   .channel(`user:${userId}:notifications`)
  //   .on('broadcast', { event: 'notification' }, (payload) => {
  //     onReceive(payload.payload as NotificationPayload)
  //   })
  //   .subscribe()

  return () => {
    sb.removeChannel(tableChannel)
    // sb.removeChannel(custom)
  }
}

