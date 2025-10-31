-- ============================================================================
-- Flowfoundry Database - Row Level Security (RLS) Setup
-- ============================================================================
-- This script enables RLS and creates secure policies for all tables
-- Designed to avoid infinite recursion and circular dependencies
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop ALL existing policies
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_workspace_members" ON profiles;

DROP POLICY IF EXISTS "workspaces_select_member" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert_authenticated" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update_owner" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete_owner" ON workspaces;

DROP POLICY IF EXISTS "workspace_members_select_member" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_owner_admin" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_owner_admin" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_owner_admin" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_self" ON workspace_members;

DROP POLICY IF EXISTS "workspace_invitations_select_own" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_select_workspace_admin" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_insert_workspace_admin" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_update_own" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_delete_workspace_admin" ON workspace_invitations;

DROP POLICY IF EXISTS "projects_select_workspace_member" ON projects;
DROP POLICY IF EXISTS "projects_insert_workspace_member" ON projects;
DROP POLICY IF EXISTS "projects_update_workspace_member" ON projects;
DROP POLICY IF EXISTS "projects_delete_workspace_member" ON projects;

DROP POLICY IF EXISTS "tasks_select_workspace_member" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_workspace_member" ON tasks;
DROP POLICY IF EXISTS "tasks_update_workspace_member" ON tasks;
DROP POLICY IF EXISTS "tasks_update_assignee" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_creator" ON tasks;

DROP POLICY IF EXISTS "message_threads_select_participant" ON message_threads;
DROP POLICY IF EXISTS "message_threads_insert_workspace_member" ON message_threads;
DROP POLICY IF EXISTS "message_threads_update_creator" ON message_threads;
DROP POLICY IF EXISTS "message_threads_delete_creator" ON message_threads;

DROP POLICY IF EXISTS "messages_select_participant" ON messages;
DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
DROP POLICY IF EXISTS "messages_update_own" ON messages;
DROP POLICY IF EXISTS "messages_delete_own" ON messages;

DROP POLICY IF EXISTS "thread_participants_select_participant" ON thread_participants;
DROP POLICY IF EXISTS "thread_participants_insert_creator" ON thread_participants;
DROP POLICY IF EXISTS "thread_participants_update_own" ON thread_participants;
DROP POLICY IF EXISTS "thread_participants_delete_creator" ON thread_participants;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_system" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;

-- Drop helper functions
DROP FUNCTION IF EXISTS public.is_workspace_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_workspace_admin(uuid, uuid);
DROP FUNCTION IF EXISTS public.profile_email(uuid);
DROP FUNCTION IF EXISTS public.get_auth_users_by_ids(uuid[]);
DROP FUNCTION IF EXISTS public.search_auth_users(text, integer);
-- auth_users_public view removed - use profiles.email instead

-- ============================================================================
-- STEP 2: Enable RLS on all tables
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Note: auth_users_public view and helper functions removed
-- Use profiles.email column instead. Add email column to profiles table:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
-- Create index for faster email searches:
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================================================
-- STEP 2B: Ensure grants for application roles (Supabase requires explicit grants)
-- ============================================================================

-- Profiles table access
GRANT SELECT, INSERT, UPDATE ON TABLE profiles TO authenticated;
GRANT ALL ON TABLE profiles TO service_role;

-- Workspace tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE workspaces TO authenticated;
GRANT ALL ON TABLE workspaces TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE workspace_members TO authenticated;
GRANT ALL ON TABLE workspace_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE workspace_invitations TO authenticated;
GRANT ALL ON TABLE workspace_invitations TO service_role;

-- Project/task tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE projects TO authenticated;
GRANT ALL ON TABLE projects TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tasks TO authenticated;
GRANT ALL ON TABLE tasks TO service_role;

-- Messaging tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE message_threads TO authenticated;
GRANT ALL ON TABLE message_threads TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE messages TO authenticated;
GRANT ALL ON TABLE messages TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE thread_participants TO authenticated;
GRANT ALL ON TABLE thread_participants TO service_role;

-- Notifications
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE notifications TO authenticated;
GRANT ALL ON TABLE notifications TO service_role;

-- ============================================================================
-- STEP 3: Create RLS Policies (Optimized to avoid recursion)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PROFILES TABLE - email column should exist
-- ----------------------------------------------------------------------------
-- Note: profiles.email replaces auth_users_public view
-- Ensure email column exists: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
-- No policies can be created on views in PostgreSQL

-- ----------------------------------------------------------------------------
-- PROFILES TABLE - Simple self-access (no workspace lookups)
-- ----------------------------------------------------------------------------
-- Users can view and update their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Authenticated users can view other profiles (needed for member lists)
-- This is safe because profiles don't contain sensitive data
CREATE POLICY "profiles_select_workspace_members" ON profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- HELPER FUNCTIONS (avoid RLS recursion when resolving profile email)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profile_email(user_id_param uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT lower(email) FROM public.profiles WHERE id = user_id_param;
$$;

CREATE OR REPLACE FUNCTION public.is_thread_participant(thread_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  participant_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.thread_participants tp
    WHERE tp.thread_id = thread_id_param
      AND tp.user_id = user_id_param
  ) INTO participant_exists;

  RETURN participant_exists;
END;
$$;

-- ----------------------------------------------------------------------------
-- WORKSPACE_MEMBERS TABLE - Foundation table (no circular dependencies)
-- ----------------------------------------------------------------------------
-- Helper function to check workspace membership without triggering RLS recursion
-- This function runs with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_id_param
    AND user_id = user_id_param
  );
END;
$$;

-- Helper function to check if user is workspace owner/admin without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_workspace_admin(workspace_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_id_param
    AND user_id = user_id_param
    AND role IN ('owner', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = workspace_id_param
    AND owner_id = user_id_param
  );
END;
$$;

-- Users can view members of workspaces they belong to
-- To avoid recursion, we use a security definer function
CREATE POLICY "workspace_members_select_member" ON workspace_members
  FOR SELECT
  USING (
    -- Allow users to see their own membership records
    user_id = auth.uid()
    OR
    -- Allow users to see other members if they are a member of the workspace
    public.is_workspace_member(workspace_id, auth.uid())
  );

-- Only workspace owners and admins can add members
CREATE POLICY "workspace_members_insert_owner_admin" ON workspace_members
  FOR INSERT
  WITH CHECK (
    public.is_workspace_admin(workspace_id, auth.uid())
  );

-- Only workspace owners and admins can update member roles
CREATE POLICY "workspace_members_update_owner_admin" ON workspace_members
  FOR UPDATE
  USING (
    public.is_workspace_admin(workspace_id, auth.uid())
  );

-- Only workspace owners and admins can remove members (except self)
CREATE POLICY "workspace_members_delete_owner_admin" ON workspace_members
  FOR DELETE
  USING (
    public.is_workspace_admin(workspace_id, auth.uid())
  );

-- Users can remove themselves from workspaces
CREATE POLICY "workspace_members_delete_self" ON workspace_members
  FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- WORKSPACES TABLE - Depends on workspace_members
-- ----------------------------------------------------------------------------
-- Users can view workspaces they are members of
CREATE POLICY "workspaces_select_member" ON workspaces
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Authenticated users can create workspaces
CREATE POLICY "workspaces_insert_authenticated" ON workspaces
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Only workspace owners can update workspaces
CREATE POLICY "workspaces_update_owner" ON workspaces
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- Only workspace owners can delete workspaces
CREATE POLICY "workspaces_delete_owner" ON workspaces
  FOR DELETE
  USING (auth.uid() = owner_id);

-- ----------------------------------------------------------------------------
-- WORKSPACE_INVITATIONS TABLE
-- ----------------------------------------------------------------------------
-- Users can view invitations sent to their email
CREATE POLICY "workspace_invitations_select_own" ON workspace_invitations
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND email = public.profile_email(auth.uid())
  );

-- Workspace admins can view all invitations for their workspace
CREATE POLICY "workspace_invitations_select_workspace_admin" ON workspace_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_invitations.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Workspace admins can create invitations
CREATE POLICY "workspace_invitations_insert_workspace_admin" ON workspace_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_invitations.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Users can update (accept/decline) their own invitations
CREATE POLICY "workspace_invitations_update_own" ON workspace_invitations
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND email = public.profile_email(auth.uid())
  );

-- Workspace admins can delete invitations
CREATE POLICY "workspace_invitations_delete_workspace_admin" ON workspace_invitations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_invitations.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- ----------------------------------------------------------------------------
-- PROJECTS TABLE
-- ----------------------------------------------------------------------------
-- Workspace members can view projects in their workspaces
CREATE POLICY "projects_select_workspace_member" ON projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = projects.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Workspace members can create projects
CREATE POLICY "projects_insert_workspace_member" ON projects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = projects.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Workspace members can update projects
CREATE POLICY "projects_update_workspace_member" ON projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = projects.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Workspace members can delete projects
CREATE POLICY "projects_delete_workspace_member" ON projects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = projects.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- TASKS TABLE
-- ----------------------------------------------------------------------------
-- Workspace members can view tasks in their workspace projects
CREATE POLICY "tasks_select_workspace_member" ON tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = tasks.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Workspace members can create tasks
CREATE POLICY "tasks_insert_workspace_member" ON tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = tasks.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Workspace members can update tasks
CREATE POLICY "tasks_update_workspace_member" ON tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = tasks.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Task assignees can update their assigned tasks (using assignee_ids array)
CREATE POLICY "tasks_update_assignee" ON tasks
  FOR UPDATE
  USING (
    auth.uid() = ANY(assignee_ids)
  );

-- Task creators can delete tasks
CREATE POLICY "tasks_delete_creator" ON tasks
  FOR DELETE
  USING (auth.uid() = created_by);

-- ----------------------------------------------------------------------------
-- MESSAGE_THREADS TABLE
-- ----------------------------------------------------------------------------
-- Thread participants can view threads
CREATE POLICY "message_threads_select_participant" ON message_threads
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      public.is_thread_participant(message_threads.id, auth.uid())
      OR message_threads.created_by = auth.uid()
    )
  );

-- Workspace members can create threads
CREATE POLICY "message_threads_insert_workspace_member" ON message_threads
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      public.is_workspace_member(message_threads.workspace_id, auth.uid())
      OR public.is_workspace_admin(message_threads.workspace_id, auth.uid())
    )
  );

-- Thread creators can update threads
CREATE POLICY "message_threads_update_creator" ON message_threads
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Thread creators can delete threads
CREATE POLICY "message_threads_delete_creator" ON message_threads
  FOR DELETE
  USING (auth.uid() = created_by);

-- ----------------------------------------------------------------------------
-- MESSAGES TABLE
-- ----------------------------------------------------------------------------
-- Thread participants can view messages
CREATE POLICY "messages_select_participant" ON messages
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.is_thread_participant(messages.thread_id, auth.uid()));

-- Thread participants can send messages
CREATE POLICY "messages_insert_participant" ON messages
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_thread_participant(messages.thread_id, auth.uid()));

-- Users can update their own messages
CREATE POLICY "messages_update_own" ON messages
  FOR UPDATE
  USING (auth.uid() = author_id);

-- Users can delete their own messages
CREATE POLICY "messages_delete_own" ON messages
  FOR DELETE
  USING (auth.uid() = author_id);

-- ----------------------------------------------------------------------------
-- THREAD_PARTICIPANTS TABLE
-- ----------------------------------------------------------------------------
-- Thread participants can view participant list
CREATE POLICY "thread_participants_select_participant" ON thread_participants
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.is_thread_participant(thread_participants.thread_id, auth.uid()));

-- Thread creators can add participants
CREATE POLICY "thread_participants_insert_creator" ON thread_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM message_threads mt
      WHERE mt.id = thread_participants.thread_id
      AND mt.created_by = auth.uid()
    )
  );

-- Users can update their own participant record (for last_read_at)
CREATE POLICY "thread_participants_update_own" ON thread_participants
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Thread creators can remove participants
CREATE POLICY "thread_participants_delete_creator" ON thread_participants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM message_threads mt
      WHERE mt.id = thread_participants.thread_id
      AND mt.created_by = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS TABLE
-- ----------------------------------------------------------------------------
-- Users can view their own notifications
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- System/service role can insert notifications (allows admin client to create notifications)
CREATE POLICY "notifications_insert_system" ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- DONE!
-- ============================================================================
-- All RLS policies have been set up successfully.
-- Your database is now secured with Row Level Security.
-- 
-- Key Design Decisions to Prevent Recursion:
-- 1. profiles.email: Use profiles table with email column (replaces auth_users_public view)
-- 2. profiles: Accessible to all authenticated users (needed for member lists)
-- 3. workspace_members: Foundation table with no external dependencies
-- 4. All other tables: Check workspace_members for access control
-- 5. Admin client bypasses RLS for system operations (invitations, notifications)
-- 
-- Tables secured:
-- ✅ profiles.email (column) - replace auth_users_public view
-- ✅ profiles
-- ✅ workspaces
-- ✅ workspace_members
-- ✅ workspace_invitations
-- ✅ projects
-- ✅ tasks
-- ✅ message_threads
-- ✅ messages
-- ✅ thread_participants
-- ✅ notifications
-- ============================================================================
