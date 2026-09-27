-- Put handle_new_user back as it was before 20260924230000 (2026-09-24, same evening).
--
-- 20260924230000 made the new-user trigger take a new account's role and organisation only when the
-- account arrived already confirmed. admin.createUser inserts the row first and confirms it in a later
-- statement, so admin-created accounts got no role and no organisation. Proven with a real
-- admin.createUser on the PR's preview branch; no production account was created in between.
--
-- This file restores the original function exactly. The profiles guard from 20260924230000 stays.
-- Superseded by 20260927200000, where role and organisation come from app_metadata.
--
-- REVERSAL: none needed; this is the reversal of part of 20260924230000.

begin;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  user_role text := new.raw_user_meta_data->>'role';
  org_id uuid := nullif(new.raw_user_meta_data->>'organization_id', '')::uuid;
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

commit;

-- PROOF (expected: true): position('email_confirmed_at' in pg_get_functiondef('public.handle_new_user()'::regprocedure)) = 0
