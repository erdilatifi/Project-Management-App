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
    set search_path = public
    as $$
    begin
      insert into public.profiles (id)
      values (new.id)
      on conflict (id) do nothing;
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

-- 3) Backfill any missing profile rows for existing auth users
insert into public.profiles (id)
select u.id
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

