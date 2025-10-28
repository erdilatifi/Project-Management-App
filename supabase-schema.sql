-- Add username to users table, unique (nullable for existing rows)
alter table if exists public.users
  add column if not exists username text;

-- Ensure uniqueness for non-null usernames
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'users_username_unique_idx'
  ) then
    execute 'create unique index users_username_unique_idx on public.users (username) where username is not null';
  end if;
end $$;

-- Optional: basic length constraint via check (only if feasible)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_username_len_chk'
  ) then
    alter table public.users add constraint users_username_len_chk check (username is null or length(username) between 3 and 32);
  end if;
end $$;

-- Optional: simple format validation (letters, numbers, underscore, dot, dash)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_username_format_chk'
  ) then
    alter table public.users add constraint users_username_format_chk check (
      username is null or username ~ '^[a-zA-Z0-9_.-]+$'
    );
  end if;
end $$;

