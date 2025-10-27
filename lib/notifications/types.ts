export type NotificationType =
  | 'workspace_invite'
  | 'workspace_removed'
  | 'workspace_member_left'
  | 'message_new'
  | 'message_mention'
  | 'task_created'
  | 'task_assigned'
  | 'task_update'

export type LinkParams = {
  type: NotificationType
  workspaceId?: string | null
  projectId?: string | null
  taskId?: string | null
  threadId?: string | null
  messageId?: string | null
}

export function iconByType(type: NotificationType): 'message' | 'user' | 'check' | 'alert' | 'task' {
  switch (type) {
    case 'workspace_invite':
    case 'workspace_removed':
    case 'workspace_member_left':
      return 'user'
    case 'message_new':
    case 'message_mention':
      return 'message'
    case 'task_created':
    case 'task_assigned':
    case 'task_update':
      return 'task'
    default:
      return 'alert'
  }
}

export function titleByType(type: NotificationType, meta?: Record<string, any>): string {
  switch (type) {
    case 'workspace_invite':
      return `You were invited to ${meta?.workspace_name ?? 'a workspace'}`
    case 'workspace_removed':
      return `You were removed from ${meta?.workspace_name ?? 'a workspace'}`
    case 'workspace_member_left':
      return `${meta?.leaver_name ?? 'A member'} left ${meta?.workspace_name ?? 'workspace'}`
    case 'message_new':
      return `${meta?.actor_name ?? 'Someone'} sent a new message`
    case 'message_mention':
      return `${meta?.actor_name ?? 'Someone'} mentioned you`
    case 'task_created': {
      const t = meta?.task_title ?? 'a task'
      if (meta?.assignee_is_actor) return `You created '${t}' (assigned to you)`
      if (meta?.assignee_name) return `Task '${t}' created (assigned to ${meta.assignee_name})`
      return `Task '${t}' created`
    }
    case 'task_assigned':
      return `You were assigned '${meta?.task_title ?? 'a task'}'`
    default:
      return 'Notification'
  }
}

export function subtitleByType(type: NotificationType, meta?: Record<string, any>): string | null {
  switch (type) {
    case 'message_new':
    case 'message_mention':
      return meta?.snippet ? String(meta.snippet) : null
    case 'workspace_invite':
      return meta?.inviter_name ? `Invited by ${meta.inviter_name}` : null
    case 'task_created':
    case 'task_assigned':
      return meta?.project_name ? String(meta.project_name) : meta?.workspace_name ?? null
    default:
      return meta?.workspace_name ?? null
  }
}

export function hrefByType(params: LinkParams): string | null {
  const { type, workspaceId, projectId, taskId, threadId, messageId } = params
  switch (type) {
    case 'workspace_invite':
    case 'workspace_removed':
    case 'workspace_member_left':
      return workspaceId ? `/workspaces/${workspaceId}` : '/workspaces'
    case 'message_new':
    case 'message_mention':
      return workspaceId && threadId
        ? `/workspaces/${workspaceId}/messages?thread=${threadId}${messageId ? `&m=${messageId}` : ''}`
        : workspaceId
        ? `/workspaces/${workspaceId}/messages`
        : '/workspaces'
    case 'task_created':
    case 'task_assigned':
      return projectId ? `/projects/${projectId}/tasks` : '/projects'
    default:
      return null
  }
}
