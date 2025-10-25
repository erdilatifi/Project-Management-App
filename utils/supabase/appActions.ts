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

// Create a workspace owned by the current user and upsert owner membership.
export async function createWorkspace(name: string, slug?: string) : Promise<WorkspaceRow | null>  {
  const supabase = createClient();

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) {
    toast.error(userErr?.message ?? "You must be signed in");
    return null;
  }
  const userId = userRes.user.id;

  try {
    const payload: Partial<WorkspaceRow> & { owner_id: string } = {
      name: name.trim(),
      owner_id: userId,
      slug: slug ? slug.trim().toLowerCase() : null,
      description: null,
    } as any;

    const { data: workspace, error } = await supabase
      .from("workspaces")
      .insert(payload)
      .select("id, name, owner_id, slug, description, created_at")
      .single<WorkspaceRow>();

    if (error) throw error;

    // Upsert owner membership (do not fail the overall operation if this part fails)
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
    if (upsertErr) toast.error(upsertErr.message);

    toast.success("Workspace created");
    return workspace;
  } catch (e: any) {
    toast.error(e?.message ?? "Failed to create workspace");
    return null;
  }
}

// Create a project in a workspace for the current user.
export async function createProject(workspaceId: string, name: string) : Promise<ProjectRow | null>  {
  const supabase = createClient();
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) {
    toast.error(userErr?.message ?? "You must be signed in");
    return null;
  }
  const userId = userRes.user.id;

  try {
    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: name.trim(),
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
export async function createTask(projectId: string, title: string) : Promise<TaskRow | null>  {
  const supabase = createClient();
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) {
    toast.error(userErr?.message ?? "You must be signed in");
    return null;
  }
  const userId = userRes.user.id;

  try {
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        title: title.trim(),
        created_by: userId,
      })
      .select("id, project_id, workspace_id, title, description, status, priority, assignee_id, due_at, created_by, created_at")
      .single<TaskRow>();

    if (error) throw error;
    toast.success("Task created");
    return data;
  } catch (e: any) {
    toast.error(e?.message ?? "Failed to create task");
    return null;
  }
}

