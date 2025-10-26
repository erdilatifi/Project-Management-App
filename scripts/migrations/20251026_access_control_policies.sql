-- Enable RLS and add access control policies for workspace-scoped data

-- Workspaces: visible only to members (including owner), managed by owner
alter table if exists public.workspaces enable row level security;

create policy if not exists workspaces_select_members
on public.workspaces for select
using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.workspace_members m
    where m.workspace_id = workspaces.id and m.user_id = auth.uid()
  )
);

create policy if not exists workspaces_insert_owner
on public.workspaces for insert
with check ( owner_id = auth.uid() );

create policy if not exists workspaces_update_owner
on public.workspaces for update
using ( owner_id = auth.uid() )
with check ( owner_id = auth.uid() );

create policy if not exists workspaces_delete_owner
on public.workspaces for delete
using ( owner_id = auth.uid() );

-- Workspace members: visible to members of that workspace
alter table if exists public.workspace_members enable row level security;

create policy if not exists members_select_within_workspace
on public.workspace_members for select
using (
  exists (
    select 1 from public.workspace_members m2
    where m2.workspace_id = workspace_members.workspace_id and m2.user_id = auth.uid()
  )
);

-- Allow owner/admin to manage membership; allow users to remove themselves
create policy if not exists members_insert_admin
on public.workspace_members for insert
with check (
  exists (
    select 1 from public.workspace_members m3
    where m3.workspace_id = workspace_members.workspace_id and m3.user_id = auth.uid() and m3.role in ('owner','admin')
  )
);

create policy if not exists members_update_admin
on public.workspace_members for update
using (
  exists (
    select 1 from public.workspace_members m3
    where m3.workspace_id = workspace_members.workspace_id and m3.user_id = auth.uid() and m3.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from public.workspace_members m3
    where m3.workspace_id = workspace_members.workspace_id and m3.user_id = auth.uid() and m3.role in ('owner','admin')
  )
);

create policy if not exists members_delete_self_or_admin
on public.workspace_members for delete
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.workspace_members m3
    where m3.workspace_id = workspace_members.workspace_id and m3.user_id = auth.uid() and m3.role in ('owner','admin')
  )
);

-- Projects: visible only to members; only creator can update/delete
alter table if exists public.projects enable row level security;

create policy if not exists projects_select_members
on public.projects for select
using (
  exists (
    select 1 from public.workspace_members m
    where m.workspace_id = projects.workspace_id and m.user_id = auth.uid()
  )
);

create policy if not exists projects_insert_member_creator
on public.projects for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.workspace_members m
    where m.workspace_id = projects.workspace_id and m.user_id = auth.uid()
  )
);

create policy if not exists projects_update_creator
on public.projects for update
using ( created_by = auth.uid() )
with check ( created_by = auth.uid() );

create policy if not exists projects_delete_creator
on public.projects for delete
using ( created_by = auth.uid() );

-- Tasks: visible to members; creator can edit/delete; admins can update (for assignment, etc.)
alter table if exists public.tasks enable row level security;

create policy if not exists tasks_select_members
on public.tasks for select
using (
  exists (
    select 1 from public.workspace_members m
    where m.workspace_id = tasks.workspace_id and m.user_id = auth.uid()
  )
);

create policy if not exists tasks_insert_member_creator
on public.tasks for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.workspace_members m
    where m.workspace_id = tasks.workspace_id and m.user_id = auth.uid()
  )
);

create policy if not exists tasks_update_creator
on public.tasks for update
using ( created_by = auth.uid() )
with check ( created_by = auth.uid() );

create policy if not exists tasks_update_admin
on public.tasks for update
using (
  exists (
    select 1 from public.workspace_members m
    where m.workspace_id = tasks.workspace_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from public.workspace_members m
    where m.workspace_id = tasks.workspace_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);

create policy if not exists tasks_delete_creator
on public.tasks for delete
using ( created_by = auth.uid() );

-- Chat: threads/messages scoped to workspace members
alter table if exists public.message_threads enable row level security;
alter table if exists public.thread_participants enable row level security;
alter table if exists public.messages enable row level security;

create policy if not exists threads_select_members
on public.message_threads for select
using (
  exists (
    select 1 from public.workspace_members m
    where m.workspace_id = message_threads.workspace_id and m.user_id = auth.uid()
  )
);
create policy if not exists threads_insert_member
on public.message_threads for insert
with check (
  exists (
    select 1 from public.workspace_members m
    where m.workspace_id = message_threads.workspace_id and m.user_id = auth.uid()
  )
);
create policy if not exists threads_update_creator
on public.message_threads for update
using ( created_by = auth.uid() )
with check ( created_by = auth.uid() );
create policy if not exists threads_delete_creator
on public.message_threads for delete
using ( created_by = auth.uid() );

create policy if not exists messages_select_members
on public.messages for select
using (
  exists (
    select 1 from public.workspace_members m
    where m.workspace_id = messages.workspace_id and m.user_id = auth.uid()
  )
);
create policy if not exists messages_insert_member
on public.messages for insert
with check (
  exists (
    select 1 from public.workspace_members m
    where m.workspace_id = messages.workspace_id and m.user_id = auth.uid()
  )
);
create policy if not exists messages_update_author
on public.messages for update
using ( author_id = auth.uid() )
with check ( author_id = auth.uid() );
create policy if not exists messages_delete_author
on public.messages for delete
using ( author_id = auth.uid() );

-- Notifications: per-user only
alter table if exists public.notifications enable row level security;
create policy if not exists notifications_select_self
on public.notifications for select
using ( user_id = auth.uid() );
create policy if not exists notifications_insert_any
on public.notifications for insert
with check ( true );

-- Invitation acceptance via secure RPC (prevents arbitrary self-join)
create or replace function public.accept_workspace_invitation(invite_token text)
returns table (workspace_id uuid, name text, owner_id uuid) as $$
declare
  inv record;
  uid uuid := auth.uid();
  uemail text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select i.* into inv
  from public.workspace_invitations i
  where i.token = invite_token
    and i.status = 'pending'
    and i.expires_at > now()
  limit 1;

  if inv is null then
    raise exception 'Invitation not found or expired';
  end if;

  -- optional email match if present
  select email into uemail from auth.users where id = uid;
  if inv.email is not null and uemail is not null and lower(inv.email) <> lower(uemail) then
    raise exception 'This invitation is for a different email';
  end if;

  -- upsert membership for current user
  insert into public.workspace_members(workspace_id, user_id, role)
  values (inv.workspace_id, uid, 'member')
  on conflict (workspace_id, user_id)
  do update set role = excluded.role;

  -- mark invitation accepted
  update public.workspace_invitations set status = 'accepted' where id = inv.id;

  -- return workspace info
  return query
    select w.id, w.name, w.owner_id
    from public.workspaces w
    where w.id = inv.workspace_id;
end;
$$ language plpgsql security definer set search_path = public;

-- Auth user lookup helpers without service key
create or replace function public.search_auth_users(q text)
returns table (id uuid, email text) as $$
  select u.id, u.email
  from auth.users u
  where u.email is not null
    and lower(u.email) like ('%' || lower(q) || '%')
  order by u.email asc
  limit 10;
$$ language sql security definer set search_path = public, auth;

create or replace function public.get_auth_users_by_ids(ids uuid[])
returns table (id uuid, email text) as $$
  select u.id, u.email
  from auth.users u
  where u.id = any(ids)
  order by u.email asc;
$$ language sql security definer set search_path = public, auth;

-- grant execution to authenticated/anon for RPC access
grant execute on function public.search_auth_users(text) to authenticated, anon;
grant execute on function public.get_auth_users_by_ids(uuid[]) to authenticated, anon;
grant execute on function public.accept_workspace_invitation(text) to authenticated;
