import { createClient } from '@/utils/supabase/client'

export type NotificationRow = {
  id: number
  user_id: string
  type: string
  title: string
  body: string | null
  data: Record<string, any> | null
  is_read: boolean
  created_at: string
}

export async function fetchNotificationsForUser(userId: string, limit = 20) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as NotificationRow[]
}

export async function markNotificationRead(id: number, isRead = true) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: isRead })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as NotificationRow
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  if (error) throw error
}

export async function createNotification(input: Omit<NotificationRow, 'id' | 'created_at'>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('notifications')
    .insert(input as any)
    .select('*')
    .single()
  if (error) throw error
  return data as NotificationRow
}

