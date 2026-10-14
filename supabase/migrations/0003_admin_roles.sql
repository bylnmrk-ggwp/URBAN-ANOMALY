-- 0003_admin_roles.sql — admin sub-roles (owner / staff)
-- Apply after 0001_schema.sql. Idempotent.
--
-- `profiles.admin_role` is only meaningful when `role = 'admin'`. Existing admins default to
-- `owner` so nobody loses access when the column lands. `is_owner()` complements `is_admin()`
-- for RLS policies / RPC guards on owner-only resources (settings, theme, discounts, team).

do $$
begin
  if not exists (select 1 from pg_type where typname = 'admin_role') then
    create type public.admin_role as enum ('owner', 'staff');
  end if;
end $$;

alter table public.profiles
  add column if not exists admin_role public.admin_role;

update public.profiles set admin_role = 'owner' where role = 'admin' and admin_role is null;

-- Buyers never carry an admin sub-role.
alter table public.profiles drop constraint if exists profiles_admin_role_requires_admin;
alter table public.profiles
  add constraint profiles_admin_role_requires_admin
  check (role = 'admin' or admin_role is null);

create or replace function public.is_owner()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and coalesce(admin_role, 'owner') = 'owner'
  );
$$;
grant execute on function public.is_owner() to anon, authenticated;

-- Only owners may change sub-roles (role itself is already guarded by profiles_guard_role).
create or replace function public.profiles_guard_admin_role()
returns trigger language plpgsql as $$
begin
  if new.admin_role is distinct from old.admin_role and not public.is_owner() then
    raise exception 'Only owners can change admin roles.' using errcode = 'FB001';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_admin_role on public.profiles;
create trigger profiles_guard_admin_role
  before update on public.profiles
  for each row execute function public.profiles_guard_admin_role();
