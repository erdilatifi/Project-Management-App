-- Add optional label columns on workspace_members and backfill from known sources
-- Safe to run multiple times; uses IF NOT EXISTS and NULL-aware updates.

begin;

-- 1) Columns to store denormalized member label data
alter table if exists public.workspace_members
  add column if not exists member_email text,
  add column if not exists member_name  text;

-- 2) Backfill member_email from public view of auth users (if available)
--    Falls back to existing value if already populated.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'auth_users_public'
  ) then
    update public.workspace_members as wm
    set member_email = coalesce(wm.member_email, a.email)
    from public.auth_users_public as a
    where wm.member_email is null
      and a.id = wm.user_id;
  end if;
end $$;

-- 3) Backfill member_name from application profile sources when missing
--    Prefer users.display_name, then profiles.full_name.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'users'
  ) then
    update public.workspace_members as wm
    set member_name = coalesce(wm.member_name, u.display_name)
    from public.users as u
    where wm.member_name is null
      and u.id = wm.user_id;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) then
    update public.workspace_members as wm
    set member_name = coalesce(wm.member_name, p.full_name)
    from public.profiles as p
    where wm.member_name is null
      and p.id = wm.user_id;
  end if;
end $$;

commit;

