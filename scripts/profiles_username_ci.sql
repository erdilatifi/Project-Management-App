-- Case-insensitive uniqueness without extensions
-- (works everywhere by indexing lower(username))

-- 1) Ensure the table exists (adjust columns if your profiles differs)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 2) Add username column if missing
alter table public.profiles
  add column if not exists username text;

-- 2a) Add email column if missing (replaces auth_users_public view)
alter table public.profiles
  add column if not exists email text;

-- 3) Constraints (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_username_len_chk'
  ) then
    alter table public.profiles
      add constraint profiles_username_len_chk
      check (username is null or length(username) between 3 and 32);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_username_format_chk'
  ) then
    alter table public.profiles
      add constraint profiles_username_format_chk
      check (username is null or username ~ '^[a-zA-Z0-9_.-]+$');
  end if;
end
$$ language plpgsql;

-- 4) Case-insensitive unique index for non-null usernames (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'profiles_username_unique_ci_idx'
  ) then
    execute 'create unique index profiles_username_unique_ci_idx
             on public.profiles ((lower(username)))
             where username is not null';
  end if;
end
$$ language plpgsql;

-- 4a) Create index on email for faster searches (idempotent)
create index if not exists idx_profiles_email on public.profiles(email);

