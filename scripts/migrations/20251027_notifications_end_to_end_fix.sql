-- Notifications and workspace membership privilege/RLS fixes
-- Safe to run multiple times.

begin;

-- Ensure core schema usage
grant usage on schema public to postgres;
grant usage on schema public to service_role;
grant usage on schema public to authenticated;
grant usage on schema public to anon;

-- Sequences in public (coverage for identity/serial columns)
grant usage, select on all sequences in schema public to service_role, authenticated;

-- Notifications table: privileges and RLS policies (if table exists)
do $$
begin
  if to_regclass('public.notifications') is not null then
    grant select, insert, update, delete on table public.notifications to service_role;
    grant select, insert, update on table public.notifications to authenticated;

    -- Enable RLS and add idempotent policies (skip if you keep RLS disabled)
    begin
      execute 'alter table public.notifications enable row level security';
    exception when others then null; end;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_select_own'
    ) then
      execute 'create policy notifications_select_own on public.notifications for select using (auth.uid() = user_id)';
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_insert_own'
    ) then
      execute 'create policy notifications_insert_own on public.notifications for insert with check (auth.uid() = user_id)';
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_update_own'
    ) then
      execute 'create policy notifications_update_own on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id)';
    end if;
  end if;
end $$;

-- Messages: allow authors to delete their own messages (RLS) and general access
do $$
begin
  if to_regclass('public.messages') is not null then
    -- Table privileges
    grant select, insert, update, delete on table public.messages to service_role;
    grant select, insert, update, delete on table public.messages to authenticated;

    -- Enable RLS
    begin
      execute 'alter table public.messages enable row level security';
    exception when others then null; end;

    -- Select: workspace members or explicit thread participants can read
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'messages' and policyname = 'messages_select_access'
    ) then
      execute $$
        create policy messages_select_access on public.messages
        for select
        using (
          exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = messages.workspace_id and wm.user_id = auth.uid()
          )
          or exists (
            select 1 from public.thread_participants tp
            where tp.thread_id = messages.thread_id and tp.user_id = auth.uid()
          )
        )
      $$;
    end if;

    -- Insert: author must be current user and must have access via workspace membership or thread participant
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'messages' and policyname = 'messages_insert_self'
    ) then
      execute $$
        create policy messages_insert_self on public.messages
        for insert
        with check (
          auth.uid() = author_id and (
            exists (
              select 1 from public.workspace_members wm
              where wm.workspace_id = messages.workspace_id and wm.user_id = auth.uid()
            )
            or exists (
              select 1 from public.thread_participants tp
              where tp.thread_id = messages.thread_id and tp.user_id = auth.uid()
            )
          )
        )
      $$;
    end if;

    -- Update: only author may update
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'messages' and policyname = 'messages_update_own'
    ) then
      execute 'create policy messages_update_own on public.messages for update using (auth.uid() = author_id) with check (auth.uid() = author_id)';
    end if;

    -- Delete: only author may delete
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'messages' and policyname = 'messages_delete_own'
    ) then
      execute 'create policy messages_delete_own on public.messages for delete using (auth.uid() = author_id)';
    end if;
  end if;
end $$;

-- Workspace members: ensure service role can upsert/select
do $$
begin
  if to_regclass('public.workspace_members') is not null then
    grant select, insert, update, delete on table public.workspace_members to service_role;
    -- Optional: allow authenticated clients to read (be careful without RLS)
    grant select on table public.workspace_members to authenticated;
  end if;
end $$;

-- Workspace invitations used by invite flows
do $$
begin
  if to_regclass('public.workspace_invitations') is not null then
    grant select, insert, update, delete on table public.workspace_invitations to service_role;
    grant select on table public.workspace_invitations to authenticated;
  end if;
end $$;

-- Workspaces: allow service role to read names during invite
do $$
begin
  if to_regclass('public.workspaces') is not null then
    grant select on table public.workspaces to service_role;
  end if;
end $$;

-- Optional defaults when running as postgres
do $$
begin
  if current_user = 'postgres' then
    alter default privileges in schema public grant usage, select on sequences to service_role, authenticated;
    alter default privileges in schema public grant all on tables to service_role;
  end if;
end $$;

commit;
