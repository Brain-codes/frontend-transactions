-- Stove records are written by the server only, and read only by people signed in (2026-09-24).
--
-- Write access to public.stove_ids and stove_ids_base is removed from the public key and from signed-in
-- users, and read access to stove_ids from the public key. Nothing in the web app or the field app
-- writes stove records directly; the functions that do (create-sale, delete-sale, external-sync,
-- external-csv-sync, manage-organizations, manage-stove-ids, upload-stove-ids-csv) write as the
-- server (create-sale since D62, 2026-09-25). Signed-in screens keep reading as they do today.
--
-- REVERSAL:
--   grant insert, update, delete on public.stove_ids to anon, authenticated;
--   grant select on public.stove_ids to anon;
--   grant insert, update, delete on public.stove_ids_base to anon, authenticated;

begin;

revoke insert, update, delete on public.stove_ids from anon, authenticated;
revoke select on public.stove_ids from anon;
revoke insert, update, delete on public.stove_ids_base from anon, authenticated;

do $$
begin
  if has_table_privilege('anon', 'public.stove_ids', 'DELETE')
     or has_table_privilege('anon', 'public.stove_ids', 'SELECT')
     or has_table_privilege('authenticated', 'public.stove_ids', 'UPDATE')
     or has_table_privilege('authenticated', 'public.stove_ids_base', 'UPDATE') then
    raise exception 'Stove records are still writable or readable from outside the server';
  end if;
  if not has_table_privilege('authenticated', 'public.stove_ids', 'SELECT') then
    raise exception 'Signed-in screens lost their read of stove records';
  end if;
  raise notice 'Stove records: server writes only, signed-in reads kept';
end $$;

commit;

-- PROOF (expected: false, false, false, true, true):
--   select has_table_privilege('anon', 'public.stove_ids', 'DELETE'),
--          has_table_privilege('anon', 'public.stove_ids', 'SELECT'),
--          has_table_privilege('authenticated', 'public.stove_ids_base', 'UPDATE'),
--          has_table_privilege('authenticated', 'public.stove_ids', 'SELECT'),
--          has_table_privilege('service_role', 'public.stove_ids', 'UPDATE');
