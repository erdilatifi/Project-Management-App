-- Extensions
create extension if not exists pgcrypto;

-- Workspace invitations
create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  invited_by uuid references auth.users(id) on delete set null,
  token text not null unique,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);
create index if not exists idx_workspace_invitations_ws on public.workspace_invitations(workspace_id);
create index if not exists idx_workspace_invitations_email on public.workspace_invitations(email);

-- Message threads per workspace
create table if not exists public.message_threads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_message_threads_ws on public.message_threads(workspace_id, created_at desc);

-- Thread participants (optional for private threads)
create table if not exists public.thread_participants (
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_thread on public.messages(thread_id, created_at asc);
create index if not exists idx_messages_ws on public.messages(workspace_id, created_at desc);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  ref_id uuid,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  title text,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, is_read, created_at desc);

-- Ensure tasks table assignee index
create index if not exists idx_tasks_assignee_status on public.tasks(assignee_id, status, created_at desc);
