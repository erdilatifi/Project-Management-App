import type { SupabaseClient } from '@supabase/supabase-js'

export type NotificationPayload = {
  id: string
  type?: string | null
  title: string | null
  body: string | null
  created_at: string
  href?: string | null
  meta?: Record<string, any> | null
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
        onReceive({
          id: row.id as string,
          type: (row.type as string) ?? null,
          title: (row.title as string) ?? null,
          body: (row.body as string) ?? null,
          created_at: row.created_at as string,
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

