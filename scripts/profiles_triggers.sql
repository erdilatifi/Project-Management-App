-- Ensure a profile row is created for each new auth user, and backfill existing.

-- 1) Helper function (idempotent creation); SECURITY DEFINER to bypass RLS if enabled
do $plpgsql$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'ensure_profile_for_new_user' and n.nspname = 'public'
  ) then
    create function public.ensure_profile_for_new_user()
    returns trigger
    language plpgsql
    security definer
    set search_path = public, auth
    as $$
    begin
      insert into public.profiles (id, email)
      values (new.id, lower(new.email))
      on conflict (id) do update
        set email = coalesce(profiles.email, lower(new.email))
        where profiles.email is null;
      return new;
    end;
    $$;
  end if;
end
$plpgsql$;

-- 2) Trigger on auth.users AFTER INSERT
do $plpgsql$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'on_auth_user_created_create_profile'
  ) then
    create trigger on_auth_user_created_create_profile
    after insert on auth.users
    for each row execute function public.ensure_profile_for_new_user();
  end if;
end
$plpgsql$;

-- 3) Backfill any missing profile rows for existing auth users with email
insert into public.profiles (id, email)
select u.id, lower(u.email)
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null and u.email is not null
on conflict (id) do nothing;

-- 4) Update existing profiles to populate email from auth.users where missing
update public.profiles p
set email = lower(u.email)
from auth.users u
where p.id = u.id
  and p.email is null
  and u.email is not null;

