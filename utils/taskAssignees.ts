import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Utility functions for managing task assignees (multiple users per task)
 */

export async function getTaskAssignees(
  supabase: SupabaseClient,
  taskId: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", taskId);
    
    if (error) throw error;
    return (data || []).map((row) => row.user_id);
  } catch (error) {
    console.error("Failed to get task assignees:", error);
    return [];
  }
}

export async function setTaskAssignees(
  supabase: SupabaseClient,
  taskId: string,
  userIds: string[],
  assignedBy?: string
): Promise<void> {
  try {
    // Remove all existing assignees
    await supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", taskId);
    
    // Add new assignees
    if (userIds.length > 0) {
      const assignments = userIds.map((userId) => ({
        task_id: taskId,
        user_id: userId,
        assigned_by: assignedBy || null,
      }));
      
      const { error } = await supabase
        .from("task_assignees")
        .insert(assignments);
      
      if (error) throw error;
    }
  } catch (error) {
    console.error("Failed to set task assignees:", error);
    throw error;
  }
}

export async function addTaskAssignee(
  supabase: SupabaseClient,
  taskId: string,
  userId: string,
  assignedBy?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("task_assignees")
      .insert({
        task_id: taskId,
        user_id: userId,
        assigned_by: assignedBy || null,
      });
    
    if (error) throw error;
  } catch (error) {
    console.error("Failed to add task assignee:", error);
    throw error;
  }
}

export async function removeTaskAssignee(
  supabase: SupabaseClient,
  taskId: string,
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", taskId)
      .eq("user_id", userId);
    
    if (error) throw error;
  } catch (error) {
    console.error("Failed to remove task assignee:", error);
    throw error;
  }
}

export async function getTasksWithAssignees(
  supabase: SupabaseClient,
  projectId: string
): Promise<Map<string, string[]>> {
  try {
    // Get all tasks for the project
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id")
      .eq("project_id", projectId);
    
    if (tasksError) throw tasksError;
    
    const taskIds = (tasks || []).map((t) => t.id);
    if (taskIds.length === 0) return new Map();
    
    // Get all assignees for these tasks
    const { data: assignees, error: assigneesError } = await supabase
      .from("task_assignees")
      .select("task_id, user_id")
      .in("task_id", taskIds);
    
    if (assigneesError) throw assigneesError;
    
    // Group by task_id
    const map = new Map<string, string[]>();
    (assignees || []).forEach((a) => {
      const existing = map.get(a.task_id) || [];
      map.set(a.task_id, [...existing, a.user_id]);
    });
    
    return map;
  } catch (error) {
    console.error("Failed to get tasks with assignees:", error);
    return new Map();
  }
}

export async function notifyTaskAssignees(
  taskId: string,
  assigneeIds: string[],
  actorId: string,
  workspaceId: string | null,
  projectId: string,
  taskTitle: string
): Promise<void> {
  try {
    // Filter out the actor from recipients
    const recipients = assigneeIds.filter((id) => id !== actorId);
    
    if (recipients.length === 0) return;
    
    await fetch("/api/notifications/fanout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "task_assigned",
        actorId,
        recipients,
        workspaceId,
        projectId,
        taskId,
        meta: { task_title: taskTitle },
      }),
    });
  } catch (error) {
    console.error("Failed to notify task assignees:", error);
  }
}
