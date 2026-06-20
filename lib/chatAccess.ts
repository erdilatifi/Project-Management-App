import type { SupabaseClient } from '@supabase/supabase-js'
import type { MessageThread } from '@/types/workspaces'

type SupabaseError = {
  code?: string
  message?: string
  details?: string | null
  hint?: string | null
}

export type ThreadParticipantRow = {
  thread_id: string
  user_id: string
  is_admin: boolean | null
  last_read_at?: string | null
}

type ParticipantInput = {
  user_id: string
  is_admin: boolean
}

function errorText(error: SupabaseError | null | undefined): string {
  return [error?.message, error?.details, error?.hint].filter(Boolean).join(' ')
}

function canFallbackFromRpc(error: SupabaseError | null | undefined): boolean {
  if (!error) return false
  const text = errorText(error).toLowerCase()
  return (
    error.code === 'PGRST202' ||
    text.includes('schema cache') ||
    text.includes('could not find the function') ||
    text.includes('function') ||
    text.includes('not allowed')
  )
}

function applyThreadCursor(query: any, cursor?: string | null) {
  return cursor ? query.lt('created_at', cursor) : query
}

function uniqueSortedThreads(threads: MessageThread[], limit: number): MessageThread[] {
  const map = new Map<string, MessageThread>()
  for (const thread of threads) {
    if (thread?.id) map.set(thread.id, thread)
  }
  return Array.from(map.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
}

export async function listAccessibleThreads(
  supabase: SupabaseClient,
  params: { workspaceId: string; userId: string; cursor?: string | null; limit?: number }
): Promise<MessageThread[]> {
  const limit = params.limit ?? 20
  const rpcParams: Record<string, unknown> = {
    workspace_id_param: params.workspaceId,
    user_id_param: params.userId,
    limit_param: limit,
  }
  if (params.cursor) rpcParams.cursor_param = params.cursor

  const { data, error } = await supabase.rpc('list_accessible_threads', rpcParams)
  if (!error) return (data ?? []) as MessageThread[]
  if (!canFallbackFromRpc(error)) throw new Error(error.message || 'Failed to load conversations')

  const createdQuery = applyThreadCursor(
    supabase
      .from('message_threads')
      .select('*')
      .eq('workspace_id', params.workspaceId)
      .eq('created_by', params.userId)
      .order('created_at', { ascending: false })
      .limit(limit),
    params.cursor
  )
  const { data: createdRows, error: createdError } = await createdQuery
  if (createdError) throw new Error(createdError.message)

  const { data: participantRows, error: participantError } = await supabase
    .from('thread_participants')
    .select('thread_id')
    .eq('user_id', params.userId)

  if (participantError) {
    const directQuery = applyThreadCursor(
      supabase
        .from('message_threads')
        .select('*')
        .eq('workspace_id', params.workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit),
      params.cursor
    )
    const { data: directRows, error: directError } = await directQuery
    if (directError) throw new Error(directError.message)
    return (directRows ?? []) as MessageThread[]
  }

  const participantThreadIds = Array.from(
    new Set((participantRows ?? []).map((row: any) => String(row.thread_id)).filter(Boolean))
  )

  if (!participantThreadIds.length) return uniqueSortedThreads((createdRows ?? []) as MessageThread[], limit)

  const participantQuery = applyThreadCursor(
    supabase
      .from('message_threads')
      .select('*')
      .eq('workspace_id', params.workspaceId)
      .in('id', participantThreadIds)
      .order('created_at', { ascending: false })
      .limit(limit),
    params.cursor
  )
  const { data: participantThreads, error: threadsError } = await participantQuery
  if (threadsError) throw new Error(threadsError.message)

  return uniqueSortedThreads(
    [...((createdRows ?? []) as MessageThread[]), ...((participantThreads ?? []) as MessageThread[])],
    limit
  )
}

export async function getThreadParticipants(
  supabase: SupabaseClient,
  threadId: string
): Promise<ThreadParticipantRow[]> {
  const { data, error } = await supabase.rpc('get_thread_participants', {
    thread_id_param: threadId,
  })
  if (!error) {
    return ((data ?? []) as any[]).map((row) => ({
      thread_id: String(row.thread_id ?? threadId),
      user_id: String(row.user_id),
      is_admin: Boolean(row.is_admin),
      last_read_at: (row.last_read_at as string | null | undefined) ?? null,
    }))
  }
  if (!canFallbackFromRpc(error)) throw new Error(error.message || 'Failed to load participants')

  const { data: rows, error: tableError } = await supabase
    .from('thread_participants')
    .select('thread_id, user_id, is_admin, last_read_at')
    .eq('thread_id', threadId)
  if (tableError) throw new Error(tableError.message)
  return ((rows ?? []) as any[]).map((row) => ({
    thread_id: String(row.thread_id ?? threadId),
    user_id: String(row.user_id),
    is_admin: Boolean(row.is_admin),
    last_read_at: (row.last_read_at as string | null | undefined) ?? null,
  }))
}

export async function getThreadReads(
  supabase: SupabaseClient,
  threadIds: string[],
  userId: string
): Promise<Array<{ thread_id: string; last_read_at: string | null }>> {
  if (!threadIds.length) return []

  const { data, error } = await supabase.rpc('get_thread_reads', {
    thread_ids_param: threadIds,
  })
  if (!error) return (data ?? []) as Array<{ thread_id: string; last_read_at: string | null }>
  if (!canFallbackFromRpc(error)) throw new Error(error.message || 'Failed to load read state')

  const { data: rows, error: tableError } = await supabase
    .from('thread_participants')
    .select('thread_id, last_read_at')
    .eq('user_id', userId)
    .in('thread_id', threadIds)
  if (tableError) throw new Error(tableError.message)
  return (rows ?? []) as Array<{ thread_id: string; last_read_at: string | null }>
}

export async function markThreadRead(
  supabase: SupabaseClient,
  threadId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase.rpc('mark_thread_read', {
    thread_id_param: threadId,
  })
  if (!error) return
  if (!canFallbackFromRpc(error)) throw new Error(error.message || 'Failed to mark conversation as read')

  const { error: tableError } = await supabase
    .from('thread_participants')
    .update({ last_read_at: new Date().toISOString() } as any)
    .eq('thread_id', threadId)
    .eq('user_id', userId)
  if (tableError) throw new Error(tableError.message)
}

export async function addThreadParticipants(
  supabase: SupabaseClient,
  threadId: string,
  participants: ParticipantInput[]
): Promise<void> {
  if (!participants.length) return

  const { error } = await supabase.rpc('add_thread_participants', {
    thread_id_param: threadId,
    participants_param: participants,
  })
  if (!error) return
  if (!canFallbackFromRpc(error)) throw new Error(error.message || 'Failed to add participants')

  const rows = participants.map((participant) => ({
    thread_id: threadId,
    user_id: participant.user_id,
    is_admin: participant.is_admin,
  }))
  const { error: tableError } = await supabase.from('thread_participants').upsert(rows as any)
  if (tableError) throw new Error(tableError.message)
}
