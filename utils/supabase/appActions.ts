"use client";

import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export interface WorkspaceRow {
  id: string;
  name: string;
  owner_id: string;
  slug: string | null;
  description: string | null;
  created_at: string;
}

export interface ProjectRow {
  id: string;
  name: string;
  workspace_id: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  is_archived?: boolean | null;
}

export interface TaskRow {
  id: string;
  project_id: string;
  workspace_id?: string;
  title: string;
  description?: string | null;
  status?: "todo" | "in_progress" | "done";
  priority?: number | null;
  assignee_id?: string | null;
  due_at?: string | null;
  created_by: string | null;
  created_at: string;
}

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `workspace-${Date.now()}`;
}

export function mapTaskRow(row: Record<string, unknown>): TaskRow {
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    workspace_id: (row.workspace_id as string | undefined) ?? undefined,
    title: row.title as string,
    description: (row.description as string | null | undefined) ?? null,
    status: (row.status as TaskRow["status"]) ?? undefined,
    priority: (row.priority as number | null | undefined) ?? null,
    assignee_id: (row.assignee_id as string | null | undefined) ?? null,
    due_at: (row.due_date as string | null | undefined) ?? null,
    created_by: (row.creator_id as string | null | undefined) ?? null,
    created_at: row.created_at as string,
  };
}

// Create a workspace owned by the current user and upsert owner membership.
export async function createWorkspace(name: string, slug?: string): Promise<WorkspaceRow | null> {
  const supabase = createClient();

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) {
    toast.error(userErr?.message ?? "You must be signed in");
    return null;
  }
  const userId = userRes.user.id;
  const trimmedName = name.trim();

  if (!trimmedName) {
    toast.error("Workspace name is required");
    return null;
  }

  try {
    const payload = {
      name: trimmedName,
      owner_id: userId,
      slug: slug?.trim() ? slug.trim().toLowerCase() : slugify(trimmedName),
      description: null,
    };

    const { data: workspace, error } = await supabase
      .from("workspaces")
      .insert(payload)
      .select("id, name, owner_id, slug, description, created_at")
      .single<WorkspaceRow>();

    if (error) throw error;

    const { error: upsertErr } = await supabase
      .from("workspace_members")
      .upsert(
        {
          workspace_id: workspace.id,
          user_id: userId,
          role: "owner",
        } as any,
        { onConflict: "workspace_id,user_id" }
      );

    if (upsertErr) {
      await supabase.from("workspaces").delete().eq("id", workspace.id);
      throw upsertErr;
    }

    toast.success("Workspace created");
    return workspace;
  } catch (e: any) {
    toast.error(e?.message ?? "Failed to create workspace");
    return null;
  }
}

// Create a project in a workspace for the current user.
export async function createProject(workspaceId: string, name: string): Promise<ProjectRow | null> {
  const supabase = createClient();
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) {
    toast.error(userErr?.message ?? "You must be signed in");
    return null;
  }
  const userId = userRes.user.id;
  const trimmedName = name.trim();

  if (!trimmedName) {
    toast.error("Project name is required");
    return null;
  }

  if (!workspaceId) {
    toast.error("Select a workspace to create a project");
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: trimmedName,
        workspace_id: workspaceId,
        created_by: userId,
      })
      .select("id, name, workspace_id, description, created_by, created_at, is_archived")
      .single<ProjectRow>();

    if (error) throw error;
    toast.success("Project created");
    return data;
  } catch (e: any) {
    toast.error(e?.message ?? "Failed to create project");
    return null;
  }
}

// Create a task in a project for the current user.
export async function createTask(projectId: string, title: string): Promise<TaskRow | null> {
  const supabase = createClient();
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) {
    toast.error(userErr?.message ?? "You must be signed in");
    return null;
  }
  const userId = userRes.user.id;
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    toast.error("Task title is required");
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        title: trimmedTitle,
        creator_id: userId,
      })
      .select("id, project_id, workspace_id, title, description, status, priority, assignee_id, due_date, creator_id, created_at")
      .single();

    if (error) throw error;
    toast.success("Task created");
    return mapTaskRow(data as Record<string, unknown>);
  } catch (e: any) {
    toast.error(e?.message ?? "Failed to create task");
    return null;
  }
}

export async function loadUserWorkspaces(): Promise<Array<{ id: string; name: string }>> {
  const supabase = createClient();
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) return [];

  const { data: memberships, error: memErr } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userRes.user.id);

  if (memErr) throw memErr;

  const ids = (memberships ?? []).map((row) => row.workspace_id as string);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name")
    .in("id", ids)
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
