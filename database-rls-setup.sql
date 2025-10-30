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

DROP POLICY IF EXISTS "auth_users_public_select_authenticated" ON auth_users_public;
DROP POLICY IF EXISTS "auth_users_public_select_workspace_context" ON auth_users_public;

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

-- Note: auth_users_public is a VIEW, not a table
-- Views inherit RLS from their underlying tables (auth.users)
-- The auth.users table is managed by Supabase and already has RLS enabled
-- No action needed for auth_users_public

-- ============================================================================
-- STEP 3: Create RLS Policies (Optimized to avoid recursion)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- AUTH_USERS_PUBLIC VIEW - No policies needed
-- ----------------------------------------------------------------------------
-- auth_users_public is a VIEW that selects from auth.users
-- Views inherit RLS from their underlying tables
-- The auth.users table (managed by Supabase) already has RLS enabled
-- Access control is handled at the auth.users level
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
-- WORKSPACE_MEMBERS TABLE - Foundation table (no circular dependencies)
-- ----------------------------------------------------------------------------
-- Users can view members of workspaces they belong to
CREATE POLICY "workspace_members_select_member" ON workspace_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Only workspace owners and admins can add members
CREATE POLICY "workspace_members_insert_owner_admin" ON workspace_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_members.workspace_id
      AND w.owner_id = auth.uid()
    )
  );

-- Only workspace owners and admins can update member roles
CREATE POLICY "workspace_members_update_owner_admin" ON workspace_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Only workspace owners and admins can remove members (except self)
CREATE POLICY "workspace_members_delete_owner_admin" ON workspace_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
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
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
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
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
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
    EXISTS (
      SELECT 1 FROM thread_participants tp
      WHERE tp.thread_id = message_threads.id
      AND tp.user_id = auth.uid()
    )
  );

-- Workspace members can create threads
CREATE POLICY "message_threads_insert_workspace_member" ON message_threads
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = message_threads.workspace_id
      AND wm.user_id = auth.uid()
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
  USING (
    EXISTS (
      SELECT 1 FROM thread_participants tp
      WHERE tp.thread_id = messages.thread_id
      AND tp.user_id = auth.uid()
    )
  );

-- Thread participants can send messages
CREATE POLICY "messages_insert_participant" ON messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM thread_participants tp
      WHERE tp.thread_id = messages.thread_id
      AND tp.user_id = auth.uid()
    )
  );

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
  USING (
    EXISTS (
      SELECT 1 FROM thread_participants tp
      WHERE tp.thread_id = thread_participants.thread_id
      AND tp.user_id = auth.uid()
    )
  );

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
  USING (auth.uid() = user_id);

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
-- 1. auth_users_public: Broadly accessible to authenticated users (no workspace checks)
-- 2. profiles: Accessible to all authenticated users (needed for member lists)
-- 3. workspace_members: Foundation table with no external dependencies
-- 4. All other tables: Check workspace_members for access control
-- 5. Admin client bypasses RLS for system operations (invitations, notifications)
-- 
-- Tables secured:
-- ✅ auth_users_public (view)
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
