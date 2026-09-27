-- New accounts take their role and organisation from what the server sets (2026-09-27).
--
-- handle_new_user (current definition: 20260924233000_restore_handle_new_user.sql) reads role and
-- organization_id from raw_user_meta_data. Every account-creating server function now also writes
-- them into raw_app_meta_data (app_metadata), and this file moves the profile onto that data alone.
--
-- Two moments, because the auth service writes an admin-created account in two steps: it inserts
-- the user with only the provider in app_metadata, then writes the rest of app_metadata in a
-- separate update. So:
--   1. handle_new_user (after insert) reads role and organisation from app_metadata. For an
--      account created in one step (the preview seed, a future auth version) that is the moment.
--   2. sync_role_from_app_metadata (after update) fills them in when app_metadata changes, but only
--      on a profile that has no role yet. A role someone set later is never overwritten, even when
--      app_metadata still holds the one the account was created with (8 such accounts on
--      2026-09-27), and the organisation is only ever filled together with the role. Nothing sets
--      a role back to null today; if something ever does, the next app_metadata write (an identity
--      link counts) would restore the creation-time role, so clear app_metadata's role with it.
-- full_name keeps coming from raw_user_meta_data: a name is not privileged. The has_changed_password
-- rule for 'admin' is kept, applied at whichever moment the role arrives.
--
-- The update trigger sits on every change to auth.users, sign-ins included. It returns at once
-- unless app_metadata changed and carries a role; it waits at most 100ms for a profile row; it
-- names no column in its trigger definition, so the auth service's own upgrades can still change
-- the table. A failure while the account is being created (no role in the old app_metadata) fails
-- the creation, so no account is left without a role; any later failure is logged and skipped.
--
-- Deploy order: the nine changed functions first (supabase/functions/README.md), then this file.
-- Applied before them, an account made by a function not yet redeployed gets no role.
--
-- Undo: restore handle_new_user from 20260924233000_restore_handle_new_user.sql, then
--   drop trigger if exists on_auth_user_app_metadata on auth.users;
--   drop function if exists public.sync_role_from_app_metadata();
--
-- Proof after applying (expect t, f, 1, 0):
--   select position('raw_app_meta_data' in pg_get_functiondef('public.handle_new_user'::regproc)) > 0,
--          position('raw_user_meta_data->>''role''' in pg_get_functiondef('public.handle_new_user'::regproc)) > 0,
--          (select count(*) from pg_trigger where tgname = 'on_auth_user_app_metadata' and tgrelid = 'auth.users'::regclass),
--          (select count(*) from public.profiles where role is null);

set local lock_timeout = '3s';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  user_role text := new.raw_app_meta_data->>'role';
  org_id uuid := nullif(new.raw_app_meta_data->>'organization_id', '')::uuid;
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    organization_id,
    has_changed_password
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    user_role,
    org_id,
    case
      when user_role = 'admin' then true
      else false
    end
  );
  return new;
end;
$function$;

create or replace function public.sync_role_from_app_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
set lock_timeout = '100ms'
as $$
declare
  app_role text := new.raw_app_meta_data->>'role';
begin
  if app_role is null or new.raw_app_meta_data is not distinct from old.raw_app_meta_data then
    return null;
  end if;
  begin
    update public.profiles
       set role = app_role,
           organization_id = nullif(new.raw_app_meta_data->>'organization_id', '')::uuid,
           has_changed_password = case when app_role = 'admin' then true else has_changed_password end
     where id = new.id
       and role is null;
  exception when others then
    if old.raw_app_meta_data->>'role' is null then
      raise;
    end if;
    raise log 'sync_role_from_app_metadata skipped for %: % %', new.id, sqlstate, sqlerrm;
  end;
  return null;
end;
$$;

revoke all on function public.sync_role_from_app_metadata() from public, anon, authenticated;

create or replace trigger on_auth_user_app_metadata
  after update on auth.users
  for each row execute function public.sync_role_from_app_metadata();
